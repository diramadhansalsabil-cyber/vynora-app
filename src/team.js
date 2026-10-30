/**
 * VynoraApp — Team Section Component
 * Developed by Kelompok ARENA
 */

import { teamData } from "./data/config.js";

export function renderTeamSection() {
  const container = document.getElementById("team-cards-container");
  if (!container) return;

  container.innerHTML = teamData.members
    .map((member, index) => {
      return `
        <div class="member-card">
          <div class="member-photo-wrap">
            <img src="${member.photo}" alt="${member.name}" class="member-img" loading="lazy" />
          </div>
          <div class="member-info">
            <h5>${index + 1}. ${member.name}</h5>
            <p>Anggota Kelompok</p>
          </div>
        </div>
      `;
    })
    .join("");
}
