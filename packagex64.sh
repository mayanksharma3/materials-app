rm -rf dist
rm -rf *x64
tsc
cp test.sh dist/test.sh
electron-packager . Materials --overwrite --icon materials.icns
electron-installer-dmg ./Materials-darwin-x64/Materials.app Materials --overwrite
rm -rf *x64
