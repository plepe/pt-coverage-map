/* global L:false */

const BoundingBox = require('boundingbox')
const escapeHtml = require('escape-html')
const OverpassFrontend = require('overpass-frontend')
const OverpassLayer = require('overpass-layer')

const routeTypes = require('./routeTypes')
let overpassFrontend

window.onload = function () {
  var map = L.map('map')

  map.attributionControl.setPrefix('<a target="_blank" href="https://github.com/plepe/pt-coverage-map/">pt-coverage-map</a>')

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

  let coverageData = []

  let file = 'data.osm'
  if (window.location.search) {
    file = window.location.search.substr(1)
  }

  overpassFrontend = new OverpassFrontend(file)

  let overpassLayer = new OverpassLayer({
    overpassFrontend,
    query: 'relation[route]',
    minZoom: 0,
    members: true,
    feature: {
      markerSymbol: '',
      styles: []
    },
    memberFeature: {
      pre: function (el) {
        el._routeType = routeTypes.default
        if (el.masters.length) {
          let type = el.masters[0].tags.route
          if (type in routeTypes) {
            el._routeType = routeTypes[type]

            if (el.masters[0].tags.colour) {
              // comment the next line to force default colors
              el._color = el.masters[0].tags.colour
            }
          }
        }

        if (!el._color) {
          el._color = el._routeType.color
        }
      },
      title: '<b>{{ tags.name }}</b>',
      body: (el) => {
        if (el.masters) {
          return el.masters.map(route => escapeHtml(route.tags.name)).join('<br>')
        }
      },
      style: function (el) {
        if (el.type === 'node') {
          return {
            nodeFeature: 'CircleMarker',
            radius: 4,
            width: 0,
            fillColor: el._color,
            fillOpacity: 1
          }
        } else {
          return {
            width: 1.5,
            color: el._color
          }
        }
      }
    }
  })

  let markerLayer = new OverpassLayer({
    overpassFrontend,
    query: 'node[marker]',
    minZoom: 0,
    feature: {
      title: '{{ tags.marker }}',
      style: {
        nodeFeature: 'Marker'
      },
      markerSymbol: ''
    }
  })

  let bounds
  overpassFrontend.BBoxQuery(
    'relation[type=route]',
    { minlon: -180, maxlon: 180, minlat: -90, maxlat: 90 },
    {
      members: true,
      memberCallback: (err, el) => {
        if (err) {
          return window.alert(err)
        }

        if (el.type === 'node') {
          coverageData.push([ el.geometry.lat, el.geometry.lon ])
        }
      }
    },
    (err, route) => {
      if (err) {
        return window.alert(err)
      }

      if (bounds) {
        bounds.extend(route.bounds)
      } else {
        bounds = new BoundingBox(route.bounds)
      }
    },
    (err) => {
      if (err) {
        return window.alert(err)
      }

      if (bounds) {
        map.fitBounds(bounds.toLeaflet())
      }

      coverageLayer1.setData(coverageData)
      coverageLayer2.setData(coverageData)

      overpassLayer.addTo(map)
      markerLayer.addTo(map)
    }
  )
}
