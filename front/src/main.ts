// front/src/main.ts

import { createPOI, fetchPOIs, fetchMissions, acceptMission, POIFeature, VehicleLocation, Mission } from './api';
import { VillageMap } from './map';

document.addEventListener('DOMContentLoaded', async () => {
  const villageMap = new VillageMap('map');

  let allPOIs: POIFeature[] = [];

  // DOM Elements
  const poiListElem = document.getElementById('poi-list');
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const btnRoute = document.getElementById('btn-route') as HTMLButtonElement;
  const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
  const destLabel = document.getElementById('dest-label');

  // Modal Elements
  const galleryModal = document.getElementById('gallery-modal');
  const closeGalleryBtn = document.getElementById('close-gallery-modal');
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryTitle = document.getElementById('gallery-title');
  const galleryDesc = document.getElementById('gallery-desc');

  const createModal = document.getElementById('create-modal');
  const btnOpenCreateModal = document.getElementById('btn-open-create-modal');
  const closeCreateBtn = document.getElementById('close-create-modal');
  const createForm = document.getElementById('create-poi-form') as HTMLFormElement;
  const coordsInput = document.getElementById('poi-coords') as HTMLInputElement;

  // 1. Connect WebSocket Tracker with Telemetry HUD Updates
  initWebSocketTracker(villageMap);

  // 2. Fetch Initial POIs
  try {
    const poiCollection = await fetchPOIs();
    allPOIs = poiCollection.features;

    villageMap.loadPOIs(poiCollection, (selectedPoi) => {
      selectPOIForRouting(selectedPoi);
    });

    renderPOIDirectory(allPOIs);
  } catch (err) {
    if (poiListElem) poiListElem.innerHTML = `<p style="color:#ff4d5e">Error connecting to Go backend</p>`;
  }

  // 3. Map Click Event (Pickup Coordinates)
  villageMap.setMapClickListener((coords) => {
    if (destLabel) destLabel.innerText = `Custom Location (${coords[1].toFixed(4)}, ${coords[0].toFixed(4)})`;
    if (btnRoute) btnRoute.disabled = false;
    if (coordsInput) coordsInput.value = `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`;
  });

  // 4. Live Search & Filter Directory
  searchInput?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    const filtered = allPOIs.filter(
      (p) =>
        p.properties.name.toLowerCase().includes(query) ||
        p.properties.category.toLowerCase().includes(query) ||
        p.properties.description.toLowerCase().includes(query)
    );
    renderPOIDirectory(filtered);
  });

  // 5. Render POI List with Photo Button
  function renderPOIDirectory(pois: POIFeature[]) {
    if (!poiListElem) return;
    poiListElem.innerHTML = '';

    if (pois.length === 0) {
      poiListElem.innerHTML = '<p style="color:#888; padding:8px;">No matching locations found.</p>';
      return;
    }

    pois.forEach((poi) => {
      const item = document.createElement('div');
      item.className = 'poi-item';

      const hasPhotos = poi.properties.images && poi.properties.images.length > 0;

      item.innerHTML = `
        <div class="poi-info">
          <strong>${poi.properties.name}</strong>
          <span>${poi.properties.description}</span>
        </div>
        <div class="poi-actions">
          ${hasPhotos ? `<button class="btn-photo" title="View Street Photos">📷</button>` : ''}
          <span class="poi-badge">${poi.properties.category}</span>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('btn-photo')) {
          e.stopPropagation();
          openPhotoGallery(poi);
          return;
        }

        villageMap.flyTo(poi.geometry.coordinates);
        selectPOIForRouting(poi);
      });

      poiListElem.appendChild(item);
    });
  }

  function selectPOIForRouting(poi: POIFeature) {
    if (destLabel) destLabel.innerText = poi.properties.name;
    if (btnRoute) btnRoute.disabled = false;
  }

  // 6. Photo Gallery Modal Logic
  function openPhotoGallery(poi: POIFeature) {
    if (!galleryModal || !galleryGrid || !galleryTitle || !galleryDesc) return;

    galleryTitle.innerText = poi.properties.name;
    galleryDesc.innerText = poi.properties.description;
    galleryGrid.innerHTML = '';

    if (poi.properties.images) {
      poi.properties.images.forEach((url) => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = poi.properties.name;
        galleryGrid.appendChild(img);
      });
    }

    galleryModal.classList.remove('hidden');
  }

  closeGalleryBtn?.addEventListener('click', () => galleryModal?.classList.add('hidden'));

  // 7. POI Creation Modal Logic
  btnOpenCreateModal?.addEventListener('click', () => createModal?.classList.remove('hidden'));
  closeCreateBtn?.addEventListener('click', () => createModal?.classList.add('hidden'));

  createForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = (document.getElementById('poi-name') as HTMLInputElement).value;
    const category = (document.getElementById('poi-category') as HTMLSelectElement).value;
    const icon = (document.getElementById('poi-icon') as HTMLSelectElement).value;
    const coordsStr = (document.getElementById('poi-coords') as HTMLInputElement).value;
    const desc = (document.getElementById('poi-desc') as HTMLTextAreaElement).value;
    const image = (document.getElementById('poi-image') as HTMLInputElement).value;

    const [lng, lat] = coordsStr.split(',').map((s) => parseFloat(s.trim()));

    if (isNaN(lng) || isNaN(lat)) {
      alert('Please enter valid coordinates as "Longitude, Latitude"');
      return;
    }

    const newPOI: POIFeature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        id: `poi_${Date.now()}`,
        name,
        category,
        icon,
        description: desc,
        images: image ? [image] : [],
      },
    };

    try {
      const created = await createPOI(newPOI);
      allPOIs.push(created);

      villageMap.addPOIMarker(created, (selected) => selectPOIForRouting(selected));
      renderPOIDirectory(allPOIs);

      createModal?.classList.add('hidden');
      createForm.reset();
      alert(`"${created.properties.name}" successfully added to village map!`);
    } catch (err) {
      alert('Failed to save POI to Go backend');
    }
  });

  btnRoute?.addEventListener('click', () => villageMap.drawRouteToSelected());
  btnClear?.addEventListener('click', () => villageMap.clearRoute());

  // 8. Mission Panel & Baito Courier System State
  let activeMission: Mission | null = null;
  let countdownTimer: number | null = null;

  const sidebar = document.querySelector('.controls-panel');
  const missionSection = document.createElement('div');
  missionSection.innerHTML = `
    <hr class="divider"/>
    <h4>📦 BAITO COURIER MISSIONS</h4>
    <div id="mission-board" class="poi-list"><p class="loading">Loading missions...</p></div>
    <div id="active-mission-hud" class="feature-meta-box hidden" style="margin-top: 10px; border-color: #ffcc00;"></div>
  `;
  sidebar?.appendChild(missionSection);

  const missionBoardElem = document.getElementById('mission-board');
  const missionHudElem = document.getElementById('active-mission-hud');

  const dummyMissions: Mission[] = [
    {
      id: 'baito-arcade-run',
      title: 'Arcade Drop Run',
      description: 'Pick up a sealed package from the neon arcade and deliver it to the harbor lockup.',
      reward: 1800,
      time_limit_sec: 75,
      pickup: [76.1518, 28.2421],
      dropoff: [76.1559, 28.2397],
      active: true,
    },
    {
      id: 'baito-grocer-burst',
      title: 'Grocer Rush',
      description: 'Carry fresh stock from the market to the apartment block before the midday rush.',
      reward: 2200,
      time_limit_sec: 90,
      pickup: [76.1506, 28.2428],
      dropoff: [76.1582, 28.2441],
      active: true,
    },
    {
      id: 'baito-river-swap',
      title: 'River Swap',
      description: 'Exchange courier parcels between the river depot and the civic station with no delays.',
      reward: 2600,
      time_limit_sec: 110,
      pickup: [76.1542, 28.2402],
      dropoff: [76.1569, 28.2446],
      active: true,
    },
    {
      id: 'baito-sunset-pickup',
      title: 'Sunset Express',
      description: 'Grab a hot pizza order from the strip and get it to the lookout before the timer hits zero.',
      reward: 3100,
      time_limit_sec: 120,
      pickup: [76.1498, 28.2411],
      dropoff: [76.1576, 28.2438],
      active: true,
    },
    {
      id: 'baito-dock-heat',
      title: 'Dockside Heat',
      description: 'Deliver a tight package to the docks while the city watch is circling the waterfront.',
      reward: 2900,
      time_limit_sec: 95,
      pickup: [76.1529, 28.2395],
      dropoff: [76.1562, 28.2409],
      active: true,
    },
  ];

  // Load Missions from Backend
  try {
    const missions = await fetchMissions();
    renderMissionBoard(missions);
  } catch (err) {
    renderMissionBoard(dummyMissions);
  }

  function renderMissionBoard(missions: Mission[]) {
    if (!missionBoardElem) return;
    missionBoardElem.innerHTML = '';

    missions.forEach((m) => {
      const item = document.createElement('div');
      item.className = 'poi-item';
      item.innerHTML = `
        <div class="poi-info">
          <strong>${m.title}</strong>
          <span>${m.description}</span>
          <small style="color: #ffcc00;">Reward: $${m.reward} • ${m.time_limit_sec}s</small>
        </div>
        <div class="poi-actions">
          <button class="btn btn-success btn-accept" data-id="${m.id}">START</button>
        </div>
      `;

      item.querySelector('.btn-accept')?.addEventListener('click', async () => {
        try {
          activeMission = await acceptMission(m.id);
          startMissionFlow(activeMission);
        } catch (err) {
          activeMission = { ...m, active: true };
          startMissionFlow(activeMission);
        }
      });

      missionBoardElem.appendChild(item);
    });
  }

  function startMissionFlow(mission: Mission) {
    if (!missionHudElem) return;
    missionHudElem.classList.remove('hidden');

    // Fly map to pickup location
    villageMap.flyTo(mission.pickup);
    
    let timeLeft = mission.time_limit_sec;
    
    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = window.setInterval(() => {
      timeLeft--;
      if (missionHudElem) {
        missionHudElem.innerHTML = `
          <strong>ACTIVE: ${mission.title}</strong><br/>
          <span style="color: ${timeLeft < 20 ? '#ff4d5e' : '#55ff55'}; font-size: 16px;">⏱️ TIME LEFT: ${timeLeft}s</span><br/>
          <small>Deliver cargo to drop-off point before time runs out!</small>
        `;
      }

      if (timeLeft <= 0) {
        if (countdownTimer) clearInterval(countdownTimer);
        alert('❌ MISSION FAILED: Time ran out!');
        missionHudElem.classList.add('hidden');
        activeMission = null;
      }
    }, 1000);
  }
});

// WebSocket Connection & Telemetry Handler
function initWebSocketTracker(villageMap: VillageMap) {
  const statusElem = document.getElementById('ws-status');
  const ws = new WebSocket('ws://localhost:4000/ws');

  ws.onopen = () => {
    if (statusElem) {
      statusElem.innerText = 'PATROL TRACKER: LIVE ●';
      statusElem.style.color = '#55ff55';
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.vehicle_id) {
      const vehicle: VehicleLocation = data;
      villageMap.updateVehicleLocation(vehicle);
    }

    if (data.geofence_alert) {
      console.warn('Geofence Alert:', data.message);
      alert(`🚨 GEOFENCE ALERT: ${data.message}`);
    }
  };

  ws.onclose = () => {
    if (statusElem) {
      statusElem.innerText = 'PATROL TRACKER: DISCONNECTED';
      statusElem.style.color = '#ff4d5e';
    }
  };
}