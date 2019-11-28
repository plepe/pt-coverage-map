const ArgumentParser = require('argparse').ArgumentParser
const request = require('request')
const fs = require('fs')

const parser = new ArgumentParser({
  addHelp: true,
  description: 'Loads specified routes from OpenStreetMap Overpass API and saves them to a .osm file'
})

parser.addArgument(
  [ '-f', '--file' ],
  {
    help: 'File to write data to (default: data.osm)',
    defaultValue: 'data.osm'
  }
)
parser.addArgument(
  [ '-b', '--bbox' ],
  {
    help: 'Load all public transport routes which cross the specified bounding box (lat,lon,lat,lon)'
  }
)
parser.addArgument(
  [ 'id' ],
  {
    help: 'Load routes with the specified relation IDs',
    nargs: '*'
  }
)
parser.addArgument(
  [ '-t', '--types' ],
  {
    help: 'When querying for a bbox, load routes of the specified types, e.g. "-t subway tram".',
    defaultValue: [ 'train', 'subway', 'monorail', 'tram', 'trolleybus', 'bus', 'aerialway', 'ferry' ],
    nargs: '*'
  }
)
parser.addArgument(
  [ '--format' ],
  {
    help: 'Format to load, either "XML" or "JSON". XML can be modified by OSM tools, e.g. JOSM.',
    choices: [ 'XML', 'JSON' ],
    defaultValue: 'XML'
  }
)

let args = parser.parseArgs()

let query = '[out:' + args.format.toLowerCase() + '];('

if (args.bbox) {
  query += 'relation[route~"^(' + args.types.join('|') + ')$"](' + args.bbox + ');'
}
if (args.id) {
  query += args.id
    .map(id => 'relation(' + id + ');')
    .join('')
}
if (!args.id.length && !args.bbox) {
  query += 'relation[route~"^(subway)$"](48.14,16.28,48.28,16.44);'
}

query += ');out meta;>;out meta;'

request(
  {
    method: 'POST',
    url: 'https://overpass-api.de/api/interpreter',
    body: query
  },
  (err, httpReq, body) => {
    fs.writeFileSync(args.file, body)
  }
)
