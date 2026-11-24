// Development build: talks to the local stack started by ./zskarte.sh start.

export const environment = {
  production: false,
  apiUrl: 'http://localhost:1337',
  tileUrl: 'http://localhost:8080/styles/osm-bright',
  searchUrl: 'http://localhost:8000/search/',
  searchLabel: 'Lokale Suche',
  showNavLink: true,
  buildVersion: 'dev',
  appUrl: 'http://localhost:4300',
  gitUrl: 'https://github.com/itzsoweli/offlinekarte',
  codeLoginEnabled: true,
  workLocalEnabled: true,
};
