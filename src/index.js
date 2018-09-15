const boundingbox = require('boundingbox')
const async = {
  each: require('async/each'),
  eachLimit: require('async/eachLimit')
}

const httpGet = require('./httpGet')

window.onload = function () {
  var map = L.map('map')

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  let coverageLayer1 = L.TileLayer.maskCanvas({
    radius: 600,
    useAbsoluteRadius: true,
    opacity: 0.5
  })
  map.addLayer(coverageLayer1)

  let coverageLayer2 = L.TileLayer.maskCanvas({
    radius: 300,
    useAbsoluteRadius: true,
    opacity: 0.5
  })
  map.addLayer(coverageLayer2)

  let routes = []
  let elements = {}
  let coverageData = {}

  httpGet('schlosspenz_aktuell.json', {}, (err, result) => {
    if (err) {
      console.log(err)
      return alert("Can't download geojson file")
    }

    result = JSON.parse(result.body)

    async.eachLimit(result.elements, 32,
      (element, done) => {
        let id = element.type + '/' + element.id
        elements[id] = element

        if (element.type === 'relation' && element.tags && element.tags.type === 'route') {
          routes.push(element)
        }

        done()
      },
      (err) => {
        async.eachLimit(routes, 4,
          (route, done) => {
            async.each(route.members,
              (member, done) => {
                let memberId = member.type + '/' + member.ref
                let element = elements[memberId]

                if (!element) {
                  console.log("Can't find element " + memberId)
                  return done()
                }

                if (member.role === 'stop') {
                  if (!(memberId in coverageData)) {
                    coverageData[memberId] = [ element.lat, element.lon ]
                  }
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
