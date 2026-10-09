const fs = require('fs');
let c = fs.readFileSync('src/components/DoctorList.tsx', 'utf8');

// Add useEffect and useCallback and fetchDoctors import
c = c.replace(
  "import React, { useState, useMemo } from 'react';",
  "import React, { useState, useMemo, useEffect, useCallback } from 'react';"
);

c = c.replace(
  "import { DoctorAvatar } from './DoctorAvatar';",
  "import { DoctorAvatar } from './DoctorAvatar';\nimport { fetchDoctors } from '../lib/doctors';"
);

// Replace filteredDoctors useMemo with full API-backed logic
const oldFilter = `  // Filtering Logic
  const filteredDoctors = useMemo(() => {
    const isDefaultState = selectedSpecialty === "all" && selectedCity === "All Cities" && consultationTypeFilter === "all" && selectedLanguage === "all" && selectedGender === "all" && selectedExperience === 0 && !availableTodayOnly && maxFeeINR === 2000 && !searchQuery.trim();
    
    return doctors.filter(doc => {
      if (isDefaultState) {
        return doc.isFeatured;
      }
      if (selectedSpecialty !== "all" && doc.specialtyId !== selectedSpecialty) return false;
      if (selectedCity !== "All Cities" && doc.city !== selectedCity) return false;
      if (consultationTypeFilter !== "all" && !doc.consultationModes.includes(consultationTypeFilter)) return false;
      if (selectedLanguage !== "all" && !doc.languages.includes(selectedLanguage)) return false;
      if (selectedGender !== "all" && doc.gender !== selectedGender) return false;
      if (doc.experienceYears < selectedExperience) return false;
      if (availableTodayOnly && !doc.availableToday) return false;
      if (doc.feeINR > maxFeeINR) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = doc.name.toLowerCase().includes(q);
        const matchSpecialty = doc.specialty.toLowerCase().includes(q);
        const matchHospital = doc.clinicName.toLowerCase().includes(q);
        const matchCity = doc.city.toLowerCase().includes(q);
        const matchAbout = doc.about.toLowerCase().includes(q);
        if (!matchName && !matchSpecialty && !matchHospital && !matchCity && !matchAbout) return false;
      }
      return true;
    }).sort`;

const newFilter = `  // Whether any active search/filter is applied
  const isSearchActive = searchQuery.trim() !== '' || selectedSpecialty !== 'all' || selectedCity !== 'All Cities' || consultationTypeFilter !== 'all' || selectedLanguage !== 'all' || selectedGender !== 'all' || selectedExperience > 0 || availableTodayOnly || maxFeeINR < 2000;

  // For API-backed search results
  const [searchResults, setSearchResults] = useState<import('../types').Doctor[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const runSearch = useCallback(async () => {
    if (!isSearchActive) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const results = await fetchDoctors({
        search: searchQuery.trim() || undefined,
        specialty: selectedSpecialty !== 'all' ? selectedSpecialty : undefined,
        city: selectedCity !== 'All Cities' ? selectedCity : undefined,
        consultationType: consultationTypeFilter !== 'all' ? consultationTypeFilter : undefined,
      });
      setSearchResults(results);
    } catch (_) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [isSearchActive, searchQuery, selectedSpecialty, selectedCity, consultationTypeFilter]);

  useEffect(() => {
    const timer = setTimeout(runSearch, 350);
    return () => clearTimeout(timer);
  }, [runSearch]);

  // When search is inactive: show featured doctors (passed-in props).
  // When search is active: use API results, then apply client-side filters that API doesn't handle.
  const filteredDoctors = useMemo(() => {
    const base = isSearchActive ? searchResults : doctors.filter(d => d.isFeatured !== false);
    return base.filter(doc => {
      if (selectedLanguage !== 'all' && !doc.languages.includes(selectedLanguage)) return false;
      if (selectedGender !== 'all' && doc.gender !== selectedGender) return false;
      if (doc.experienceYears < selectedExperience) return false;
      if (availableTodayOnly && !doc.availableToday) return false;
      if (doc.feeINR > maxFeeINR) return false;
      return true;
    }).sort`;

c = c.replace(oldFilter, newFilter);

fs.writeFileSync('src/components/DoctorList.tsx', c);
console.log('Fixed DoctorList.tsx');
