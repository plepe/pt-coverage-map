const async = {
  each: require('async/each'),
  eachLimit: require('async/eachLimit')
}

class OSMDB {
  constructor () {
    this.elements = {}
    this.routes = []
  }

  read (result, callback) {
    async.eachLimit(result.elements, 32,
      (element, done) => {
        let id = element.type + '/' + element.id
        this.elements[id] = element

        if (!('tags' in element)) {
          element.tags = {}
        }

        if (element.type === 'relation' && element.tags.type === 'route') {
          this.routes.push(element)
        }

        done()
      },
      callback
    )
  }

  get (type, id) {
    if (!id && type.match(/\//)) {
      return this.elements[type]
    }

    return this.elements[type + '/' + id]
  }

  assembleGeometry (element) {
    if ('geometry' in element) {
      return element.geometry
    }

    return element.nodes.map(nodeId => this.elements['node/' + nodeId])
  }
}

module.exports = OSMDB
