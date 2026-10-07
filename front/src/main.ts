import { fetchPOIs, POIFeature } from './api';
import { VillageMap } from './map';

document.addEventListener('DOMContentLoaded', async () => {
  const villageMap = new VillageMap('map');
  const poiListElem = document.getElementById('poi-list');
  const btnRoute = document.getElementById('btn-route') as HTMLButtonElement;
  const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
  const destLabel = document.getElementById('dest-label');

  // 1. Fetch POIs from Go Backend
  try {
    const poiCollection = await fetchPOIs();

    // 2. Load onto Map
    villageMap.loadPOIs(poiCollection, (selectedPoi: POIFeature) => {
      if (destLabel) destLabel.innerText = selectedPoi.properties.name;
      if (btnRoute) btnRoute.disabled = false;
    });

    // 3. Render POI Drawer List
    if (poiListElem) {
      poiListElem.innerHTML = '';
      poiCollection.features.forEach((poi) => {
        const item = document.createElement('div');
        item.className = 'poi-item';
        item.innerHTML = `
          <div class="poi-info">
            <strong>${poi.properties.name}</strong>
            <span>${poi.properties.description}</span>
          </div>
          <span class="poi-badge">${poi.properties.category}</span>
        `;

        item.addEventListener('click', () => {
          villageMap.flyTo(poi.geometry.coordinates);
          if (destLabel) destLabel.innerText = poi.properties.name;
          if (btnRoute) btnRoute.disabled = false;
        });

        poiListElem.appendChild(item);
      });
    }
  } catch (err) {
    if (poiListElem) {
      poiListElem.innerHTML = `<p style="color:#ff4d5e">Error connecting to Go backend at http://localhost:4000</p>`;
    }
  }

  // Event Listeners for Control Buttons
  btnRoute?.addEventListener('click', () => {
    villageMap.drawRouteToSelected();
  });

  btnClear?.addEventListener('click', () => {
    villageMap.clearRoute();
  });
});