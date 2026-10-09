#!/usr/bin/env bash
# Puts the icons storyboards refer to by name ("icon": "aks") into packages/renderer/public/icons/.
# Nothing here is committed: the logos come from Iconify sets installed by npm, and the
# Azure service icons from Microsoft's architecture icon pack (Microsoft's terms apply;
# see .cache/azure-icons-src/…/Microsoft_Terms_of_Use.pdf after download).
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
icons="$here/packages/renderer/public/icons"; mkdir -p "$icons"

# 1. product logos, from @iconify-json/logos and @iconify-json/devicon
cd "$here/packages/renderer"
node -e '
const fs = require("fs");
const sets = { logos: require("@iconify-json/logos/icons.json"), devicon: require("@iconify-json/devicon/icons.json") };
const want = { azure: ["logos","microsoft-azure"], "azure-mark": ["logos","azure-icon"], kubernetes: ["logos","kubernetes"],
  mongodb: ["logos","mongodb-icon"], dotnet: ["logos","dotnet"], angular: ["logos","angular-icon"], cloudflare: ["logos","cloudflare-icon"],
  "cloudflare-workers": ["logos","cloudflare-workers-icon"], redis: ["logos","redis"], meta: ["logos","meta-icon"],
  "google-ads": ["logos","google-ads"], csharp: ["devicon","csharp"], docker: ["logos","docker-icon"] };
for (const [name, [set, id]] of Object.entries(want)) {
  const j = sets[set], ic = j.icons[id], w = ic.width || j.width || 16, h = ic.height || j.height || 16;
  fs.writeFileSync(process.argv[1] + "/" + name + ".svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${ic.body}</svg>`);
}' "$icons"

# 2. Azure service icons
src="$here/.cache/azure-icons-src"; mkdir -p "$src"
[ -f "$src/azure-icons.zip" ] || curl -sSL -o "$src/azure-icons.zip" "https://arch-center.azureedge.net/icons/Azure_Public_Service_Icons_V21.zip"
[ -d "$src/azure-zip" ] || unzip -q -o "$src/azure-icons.zip" -d "$src/azure-zip"
A="$src/azure-zip/Azure_Public_Service_Icons/Icons"
cp "$A/integration/10836-icon-service-Azure-Service-Bus.svg" "$icons/azure-service-bus.svg"
cp "$A/general/10840-icon-service-Storage-Queue.svg"         "$icons/azure-storage-queue.svg"
cp "$A/compute/10023-icon-service-Kubernetes-Services.svg"   "$icons/aks.svg"
cp "$A/databases/10121-icon-service-Azure-Cosmos-DB.svg"     "$icons/cosmos-db.svg"
cp "$A/web/10052-icon-service-SignalR.svg"                   "$icons/signalr.svg"
cp "$A/compute/10029-icon-service-Function-Apps.svg"         "$icons/azure-functions.svg"
cp "$A/storage/10086-icon-service-Storage-Accounts.svg"      "$icons/azure-storage.svg"
cp "$A/security/10245-icon-service-Key-Vaults.svg"           "$icons/key-vault.svg"
cp "$A/web/01007-icon-service-Static-Apps.svg"               "$icons/static-web-apps.svg"
echo "icons in $icons: $(ls "$icons" | wc -l | tr -d ' ')"
