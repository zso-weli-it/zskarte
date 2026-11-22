const fs = require('fs');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
// changelog entries are looked up by the package version
const plainVersion = packageJson.version;
// shown as the app version (service worker, login page): ZSKarte_<commit of the app folder>, set by zskarte.sh
const version = `${process.env.ZSK_VERSION_PREFIX || 'ZSKarte'} v${plainVersion}-${process.env.COMMIT_SHA || 'unknown'}`;

const date = new Date().toISOString().split('T')[0];

const ngswConfigPath = './ngsw-config.json';
const ngswConfig = JSON.parse(fs.readFileSync(ngswConfigPath, 'utf8'));

function extractChangelogForVersion(changelogPath, version) {
  const content = fs.readFileSync(changelogPath, 'utf8');
  const lines = content.split('\n');
  let found = false;
  const changelog = [];
  
  for (const line of lines) {
    if (/^## /.test(line)) {
      if (found) break;
      if (line.includes(version)) {
        found = true;
        continue;
      }
    }
    
    if (found && line.trim()) {
      changelog.push(line);
    }
  }
  
  return changelog.join('\n').trim();
}

const changelogContent = extractChangelogForVersion('../../CHANGELOG.md', plainVersion);
// served as /assets/CHANGELOG.md (Angular forbids assets outside the workspace root)
fs.copyFileSync('../../CHANGELOG.md', 'src/assets/CHANGELOG.md');

ngswConfig.appData = {
  version,
  buildDate: date,
  changelog: changelogContent || 'Minor update'
};

fs.writeFileSync(ngswConfigPath, JSON.stringify(ngswConfig, null, 2));
console.log(`Updated ngsw-config.json with version ${version}`);
