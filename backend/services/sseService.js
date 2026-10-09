/**
 * backend/services/sseService.js
 * Lightweight Server-Sent Events (SSE) hub for real-time schedule updates.
 */

// Map of doctorId -> Set of client response objects
const clientsByDoctor = new Map();

/**
 * Register an active SSE client connection for a specific doctor.
 */
export function addClient(doctorId, res) {
  if (!doctorId || !res) return;

  if (!clientsByDoctor.has(doctorId)) {
    clientsByDoctor.set(doctorId, new Set());
  }
  clientsByDoctor.get(doctorId).add(res);

  console.log(`[SSE] Client connected for doctor=${doctorId}. Total connections: ${clientsByDoctor.get(doctorId).size}`);

  // Send initial connection confirmation event
  res.write(`event: connected\ndata: ${JSON.stringify({ doctorId, timestamp: new Date().toISOString() })}\n\n`);

  // Handle client disconnect
  res.on('close', () => {
    removeClient(doctorId, res);
  });
}

/**
 * Remove an SSE client connection.
 */
export function removeClient(doctorId, res) {
  if (!doctorId || !clientsByDoctor.has(doctorId)) return;
  const set = clientsByDoctor.get(doctorId);
  set.delete(res);
  if (set.size === 0) {
    clientsByDoctor.delete(doctorId);
  }
  console.log(`[SSE] Client disconnected for doctor=${doctorId}. Remaining: ${set.size}`);
}

/**
 * Broadcast a schedule change event to all clients viewing a doctor's schedule.
 * Payload includes doctorId, action, and optional date/block info (no sensitive patient data).
 */
export function broadcastScheduleUpdate(doctorId, payload = {}) {
  if (!doctorId || !clientsByDoctor.has(doctorId)) {
    console.log(`[SSE] No active clients connected for doctor=${doctorId}.`);
    return;
  }

  const clients = clientsByDoctor.get(doctorId);
  const dataString = JSON.stringify({
    doctorId,
    action: payload.action || 'schedule_updated',
    date: payload.date || null,
    timestamp: new Date().toISOString(),
  });

  console.log(`[SSE] Broadcasting schedule_update to ${clients.size} clients for doctor=${doctorId}: ${payload.action}`);

  for (const clientRes of clients) {
    try {
      clientRes.write(`event: schedule_update\ndata: ${dataString}\n\n`);
    } catch (err) {
      console.error('[SSE Broadcast Error]:', err.message);
      clients.delete(clientRes);
    }
  }
}
