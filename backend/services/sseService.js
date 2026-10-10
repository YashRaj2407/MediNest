/**
 * backend/services/sseService.js
 * Lightweight Server-Sent Events (SSE) hub for real-time schedule and appointment updates.
 * Supports real-time event streaming to both clinicians and patients.
 */

// Map of entityId (doctorId or patientId) -> Set of client response objects
const clientsByEntity = new Map();

/**
 * Register an active SSE client connection for a specific doctor or patient.
 */
export function addClient(entityId, res) {
  if (!entityId || !res) return;

  if (!clientsByEntity.has(entityId)) {
    clientsByEntity.set(entityId, new Set());
  }
  clientsByEntity.get(entityId).add(res);

  console.log(`[SSE] Client connected for entity=${entityId}. Total connections: ${clientsByEntity.get(entityId).size}`);

  // Send initial connection confirmation event
  res.write(`event: connected\ndata: ${JSON.stringify({ entityId, timestamp: new Date().toISOString() })}\n\n`);

  // Handle client disconnect
  res.on('close', () => {
    removeClient(entityId, res);
  });
}

/**
 * Remove an SSE client connection.
 */
export function removeClient(entityId, res) {
  if (!entityId || !clientsByEntity.has(entityId)) return;
  const set = clientsByEntity.get(entityId);
  set.delete(res);
  if (set.size === 0) {
    clientsByEntity.delete(entityId);
  }
  console.log(`[SSE] Client disconnected for entity=${entityId}. Remaining: ${set.size}`);
}

/**
 * Helper to broadcast an event to all connected clients for a given entity ID.
 */
function broadcastToEntity(entityId, eventName, data) {
  if (!entityId || !clientsByEntity.has(entityId)) return;
  const clients = clientsByEntity.get(entityId);
  const dataString = JSON.stringify(data);

  console.log(`[SSE] Broadcasting ${eventName} to ${clients.size} clients for entity=${entityId}`);

  for (const clientRes of Array.from(clients)) {
    try {
      clientRes.write(`event: ${eventName}\ndata: ${dataString}\n\n`);
    } catch (err) {
      console.error(`[SSE Broadcast Error for ${entityId}]:`, err.message);
      clients.delete(clientRes);
    }
  }
}

/**
 * Broadcast a schedule change event to all clients viewing a doctor's schedule.
 */
export function broadcastScheduleUpdate(doctorId, payload = {}) {
  const data = {
    doctorId,
    action: payload.action || 'schedule_updated',
    date: payload.date || null,
    appointmentId: payload.appointmentId || null,
    timestamp: new Date().toISOString(),
  };

  broadcastToEntity(doctorId, 'schedule_update', data);
}

/**
 * Broadcast an appointment status update to both the assigned doctor AND the patient.
 */
export function broadcastAppointmentUpdate({ doctorId, patientId, appointmentId, action = 'appointment_completed', status = 'completed' }) {
  const payload = {
    doctorId,
    patientId,
    appointmentId,
    action,
    status,
    timestamp: new Date().toISOString(),
  };

  if (doctorId) {
    broadcastToEntity(doctorId, 'appointment_update', payload);
    broadcastToEntity(doctorId, 'schedule_update', payload);
  }

  if (patientId) {
    broadcastToEntity(patientId, 'appointment_update', payload);
  }
}
