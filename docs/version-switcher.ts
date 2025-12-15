/**
 * Fetches a versions.json file and builds a version switcher dropdown
 * in the mdBook sidebar.
 */
function buildVersionSwitcher() {
  // Create the container for our version switcher
  const versionSwitcherContainer: HTMLDivElement = document.createElement('div');
  versionSwitcherContainer.className = 'version-switcher';
  versionSwitcherContainer.style.padding = '10px';
  versionSwitcherContainer.style.borderTop = '1px solid #eee';
  versionSwitcherContainer.style.marginTop = '10px';

  // Create the label
  const label: HTMLParagraphElement = document.createElement('p');
  label.textContent = 'Select Version:';
  label.style.margin = '0 0 5px 0';
  label.style.fontSize = '0.9em';
  label.style.fontWeight = 'bold';
  versionSwitcherContainer.appendChild(label);

  // Create the select dropdown
  const select: HTMLSelectElement = document.createElement('select');
  select.style.width = '100%';
  select.onchange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    const selectedVersion = target.value;
    // Get the current relative path without the version prefix
    // Assumes URL is /<repo-name>/<version>/...
    const currentPath = window.location.pathname.replace(/^\/camera-optics\/[^/]+\//, '');
    // Construct the new URL
    window.location.href = `/camera-optics/${selectedVersion}/${currentPath}`;
  };
  versionSwitcherContainer.appendChild(select);

  // Find the sidebar to inject the switcher into
  const sidebar: HTMLElement | null = document.querySelector('.sidebar-scrollbox');
  if (sidebar) {
    sidebar.appendChild(versionSwitcherContainer);
  } else {
    console.error('mdBook sidebar not found for version switcher.');
    return;
  }

  // Fetch the versions.json file from the root of the site
  fetch('/camera-optics/versions.json')
    .then((response) => response.json())
    .then((versions: string[]) => {
      const pathParts = window.location.pathname.split('/');
      const currentVersion = pathParts[2] || 'latest';

      versions.forEach((version) => {
        const option = document.createElement('option');
        option.value = version;
        option.textContent = version;
        if (version === currentVersion) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    })
    .catch((error) => {
      console.error('Failed to load versions for switcher:', error);
      versionSwitcherContainer.innerHTML =
        '<p style="color: red; font-size: 0.8em;">Could not load versions.</p>';
    });
}

// Run the function after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', buildVersionSwitcher);
