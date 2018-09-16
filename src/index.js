const boundingbox = require('boundingbox')
const async = {
  each: require('async/each'),
  eachLimit: require('async/eachLimit')
}
const escapeHtml = require('escape-html')

const httpGet = require('./httpGet')
const convertFromXML = require('./convertFromXML')
const OSMDB = require('./OSMDB')

const routeTypes = {
  'tram': {
    color: '#ff0000'
  },
  'bus': {
    color: '#0000ff'
  }
}

window.onload = function () {
  var map = L.map('map')

  L.tileLayer("https://{s}.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png", {
      subdomains : ['maps', 'maps1', 'maps2', 'maps3', 'maps4'],
      attribution: '&copy; <a href="http://basemap.at">Basemap.at</a>'
  }).addTo(map)

  let coverageLayer1 = L.TileLayer.maskCanvas({
    radius: 600,
    useAbsoluteRadius: true,
    opacity: 0.3,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  })
  map.addLayer(coverageLayer1)

  let coverageLayer2 = L.TileLayer.maskCanvas({
    radius: 300,
    useAbsoluteRadius: true,
    opacity: 0.2,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  })
  map.addLayer(coverageLayer2)

  let markerLayer = L.featureGroup()
  map.addLayer(markerLayer)

  let routeLayer = L.featureGroup()
  map.addLayer(routeLayer)

  let stopLayer = L.featureGroup()
  map.addLayer(stopLayer)

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
        async.eachLimit(db.routes, 4,
          (route, done) => {
            async.each(route.members,
              (member, done) => {
                let memberId = member.type + '/' + member.ref
                let element = db.get(member.type, member.ref)

                if (!element) {
                  console.log("Can't find element " + memberId)
                  return done()
                }

                if (!element.routes) {
                  element.routes = []
                }
                element.routes.push(route)

                if (member.role === 'stop') {
                  if (!(memberId in coverageData)) {
                    coverageData[memberId] = [ element.lat, element.lon ]
                  }
                }

                if (member.role === '' && member.type === 'way') {
                  let geometry = db.assembleGeometry(element)
                  let way = L.polyline(geometry.map((geom => [ geom.lat, geom.lon ])),
                  {
                    weight: 1.5,
                    color: route.tags.route in routeTypes ? routeTypes[route.tags.route].color : '#000000'
                  })
                  routeLayer.addLayer(way)
                }

                if (member.role === 'stop' && member.type === 'node') {
                  if (!member.feature) {
                    member.feature = L.circleMarker([ element.lat, element.lon ],
                    {
                      radius: 4,
                      weight: 0,
                      fillColor: route.tags.route in routeTypes ? routeTypes[route.tags.route].color : '#000000',
                      fillOpacity: 1
                    })
                    stopLayer.addLayer(member.feature)
                  }

                  member.feature.bindPopup(
                    '<b>' + escapeHtml(element.tags.name) + '</b><br>' +
                    element.routes.map(route => escapeHtml(route.tags.name)).join('<br>')
                  )
                }

                done()
              },
              (err) => {
                done(err)
              }
            )
          },
          (err) => {
            let data = Object.values(coverageData)
            coverageLayer1.setData(data)
            coverageLayer2.setData(data)

            let bounds = new BoundingBox(data[0])
            data.slice(1).forEach(
              (value) => {
                bounds.extend(value)
              }
            )

            map.fitBounds(bounds.toLeaflet())
          }
        )
      }
    )
  })
}
