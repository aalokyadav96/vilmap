export class InfoCardManager {
  private infoCard: HTMLDivElement | null = null;

  public showInfoCard(title: string, subtitle: string, body: string) {
    if (!this.infoCard) {
      const card = document.createElement('div');
      card.className = 'feature-info-card hidden';
      card.innerHTML = `
        <div class="feature-info-header">
          <div>
            <h3></h3>
            <p></p>
          </div>
          <button type="button" aria-label="Close panel">×</button>
        </div>
        <div class="feature-info-body"></div>
      `;

      const closeButton = card.querySelector('button');
      closeButton?.addEventListener('click', () => card.classList.add('hidden'));
      document.body.appendChild(card);
      this.infoCard = card;
    }

    const header = this.infoCard.querySelector('h3');
    const subheader = this.infoCard.querySelector('p');
    const bodyEl = this.infoCard.querySelector('.feature-info-body');

    if (header) header.textContent = title;
    if (subheader) subheader.textContent = subtitle;
    if (bodyEl) bodyEl.innerHTML = body;

    this.infoCard.classList.remove('hidden');
  }
}