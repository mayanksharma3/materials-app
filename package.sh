rm -rf dist
rm -rf *arm64
tsc
electron-packager . Materials --overwrite --icon materials.icns
electron-installer-dmg ./Materials-darwin-arm64/Materials.app Materials --overwrite
rm -rf *arm64
open Materials.dmg
