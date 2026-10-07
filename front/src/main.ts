import { createPOI, fetchPOIs, POIFeature, VehicleLocation } from './api';
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

  // 1. Connect WebSocket Tracker
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

    // Pre-fill creation modal input
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
        // Handle Photo button click separately
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

      // Add to map & refresh directory
      villageMap.addPOIMarker(created, (selected) => selectPOIForRouting(selected));
      renderPOIDirectory(allPOIs);

      createModal?.classList.add('hidden');
      createForm.reset();
      alert(`"${created.properties.name}" successfully added to village map!`);
    } catch (err) {
      alert('Failed to save POI to Go backend');
    }
  });

  // Buttons
  btnRoute?.addEventListener('click', () => villageMap.drawRouteToSelected());
  btnClear?.addEventListener('click', () => villageMap.clearRoute());
});

// WebSocket Connection Helper
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
    const vehicle: VehicleLocation = JSON.parse(event.data);
    villageMap.updateVehicleLocation(vehicle);
  };

  ws.onclose = () => {
    if (statusElem) {
      statusElem.innerText = 'PATROL TRACKER: DISCONNECTED';
      statusElem.style.color = '#ff4d5e';
    }
  };
}