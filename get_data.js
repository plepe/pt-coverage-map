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

let args = parser.parseArgs()

const query = fs.readFileSync('get_data.txt')

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
