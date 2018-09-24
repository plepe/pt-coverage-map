const boundingbox = require('boundingbox')
const async = {
  each: require('async/each'),
  eachLimit: require('async/eachLimit')
}
const escapeHtml = require('escape-html')

const httpGet = require('./httpGet')
const convertFromXML = require('./convertFromXML')
const OSMDB = require('./OSMDB')

function comfort (el) {
  if (!el.tags || !el.tags.comfort) {
    return '#000000'
  }

  return [ '#ff0000', '#ff7f00', '#007f00' ][el.tags.comfort - 1]
}

window.onload = function () {
  var map = L.map('map').setView([ 48.19, 16.36 ], 14)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  let coverageLayer1 = L.TileLayer.maskCanvas({
    radius: 600,
    useAbsoluteRadius: true,
    opacity: 0.3
  })
  map.addLayer(coverageLayer1)

  let coverageLayer2 = L.TileLayer.maskCanvas({
    radius: 300,
    useAbsoluteRadius: true,
    opacity: 0.2
  })
  map.addLayer(coverageLayer2)

  let markerLayer = L.featureGroup()
  map.addLayer(markerLayer)

  let routeLayer = L.featureGroup()
  map.addLayer(routeLayer)

  let stopLayer = L.featureGroup()
  map.addLayer(stopLayer)
  let nodePane = map.createPane('node')
  map.getPane('node').style.zIndex = 650

  let coverageData = {}

  let file = 'data.osm'
  if (location.search) {
    file = location.search.substr(1)
  }

  httpGet(file, { type: 'auto' }, (err, result) => {
    if (err) {
      console.log(err)
      return alert("Can't download geojson file " + file + '.json')
    }

    if (result.request.responseXML) {
      result = convertFromXML(result.request.responseXML.firstChild)
    } else {
      result = JSON.parse(result.body)
    }

    if ('marker' in result) {
      result.marker.forEach(
        (marker) => {
          let feature = L.marker([ marker.lat, marker.lon ]).addTo(markerLayer)

          if ('text' in marker) {
            feature.bindPopup(marker.text)
          }
        }
      )
    }

    let db = new OSMDB()
    db.read(result,
      (err) => {
        async.each(db.elements,
          (element, done) => {

            if (element.type === 'way') {
              let geometry = db.assembleGeometry(element)
              let way = L.polyline(geometry.map((geom) => [ geom.lat, geom.lon ]),
                {
                  weight: 4,
                  color: comfort(element)
                })
              routeLayer.addLayer(way)

              if (element.tags.direction) {
                way.setStyle({
                  opacity: 0
                })

                let forward = element.tags.direction !== 'backward'
                let decorator = L.polylineDecorator(way, {
                  patterns: [
                    {
                      offset: forward ? 5 : 0,
                      endOffset: forward ? 0 : 5,
                      repeat: 6,
                      symbol:
                        forward
                          ? L.Symbol.arrowHead({ angleCorrection: 0, pixelSize: 4, polygon: false, pathOptions: {stroke: true, weight: 2, color: comfort(element) } })
                          : L.Symbol.arrowHead({ angleCorrection: 180, pixelSize: 4, polygon: false, pathOptions: {stroke: true, weight: 2, color: comfort(element), headAngle: 90 } })
                    }
                  ]
                }).addTo(map);
              }
            }

            if (element.type === 'node' && element.tags && element.tags.node) {
                let feature = L.circleMarker([ element.lat, element.lon ],
                {
                  radius: 8,
                  weight: 0,
                  fillColor: '#000000',
                  fillOpacity: 1,
                  pane: 'node'
                })
              stopLayer.addLayer(feature)
            }

            done()
         })
      })
  })
}
