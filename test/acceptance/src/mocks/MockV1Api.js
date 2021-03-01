const AbstractMockApi = require('./AbstractMockApi')
const sinon = require('sinon')

class MockV1Api extends AbstractMockApi {
  reset() {
    this.affiliations = []
    this.allInstitutionDomains = new Set()
    this.blocklistedDomains = []
    this.brand_variations = {}
    this.brands = {}
    this.doc_exported = {}
    this.docInfo = {}
    this.existingEmails = []
    this.exportId = null
    this.exportParams = null
    this.institutionDomains = {}
    this.institutionId = 1000
    this.institutions = {}
    this.syncUserFeatures = sinon.stub()
    this.templates = {}
    this.updateEmail = sinon.stub()
    this.users = {}
    this.v1Id = 1000
    this.validation_clients = {}
  }

  nextInstitutionId() {
    return this.institutionId++
  }

  nextV1Id() {
    return this.v1Id++
  }

  setUser(id, user) {
    this.users[id] = user
  }

  getDocInfo(token) {
    return this.docInfo[token] || null
  }

  setDocInfo(token, info) {
    this.docInfo[token] = info
  }

  setExportId(id) {
    this.exportId = id
  }

  getLastExportParams() {
    return this.exportParams
  }

  clearExportParams() {
    this.exportParams = null
  }

  createInstitution(options = {}) {
    const id = options.university_id || this.nextInstitutionId()
    options.id = id // include ID so that it is included in APIs
    this.institutions[id] = { ...options }
    if (options && options.hostname) {
      this.addInstitutionDomain(id, options.hostname)
    }
    return id
  }

  addInstitutionDomain(id, domain) {
    if (this.allInstitutionDomains.has(domain)) return
    if (!this.institutionDomains[id]) this.institutionDomains[id] = new Set()
    this.institutionDomains[id].add(domain)
    this.allInstitutionDomains.add(domain)
  }

  updateInstitution(id, options) {
    Object.assign(this.institutions[id], options)
  }

  addAffiliation(userId, email) {
    let institution
    if (!email) return

    const domain = email.split('@').pop()

    if (this.blocklistedDomains.indexOf(domain.replace('.com', '')) !== -1) {
      return
    }

    if (this.allInstitutionDomains.has(domain)) {
      for (const [id, domainSet] of Object.entries(this.institutionDomains)) {
        if (domainSet.has(domain)) {
          institution = this.institutions[id]
        }
      }
    }

    if (institution) {
      if (!this.affiliations[userId]) this.affiliations[userId] = []
      this.affiliations[userId].push({ email, institution })
    }
  }

  setAffiliations(userId, affiliations) {
    this.affiliations[userId] = affiliations
  }

  setDocExported(token, info) {
    this.doc_exported[token] = info
  }

  setTemplates(templates) {
    this.templates = templates
  }

  applyRoutes() {
    this.app.get(
      '/api/v1/sharelatex/users/:v1_user_id/plan_code',
      (req, res) => {
        const user = this.users[req.params.v1_user_id]
        if (user) {
          res.json(user)
        } else {
          res.sendStatus(404)
        }
      }
    )

    this.app.get(
      '/api/v1/sharelatex/users/:v1_user_id/subscriptions',
      (req, res) => {
        const user = this.users[req.params.v1_user_id]
        if (user && user.subscription) {
          res.json(user.subscription)
        } else {
          res.sendStatus(404)
        }
      }
    )

    this.app.get(
      '/api/v1/sharelatex/users/:v1_user_id/subscription_status',
      (req, res) => {
        const user = this.users[req.params.v1_user_id]
        if (user && user.subscription_status) {
          res.json(user.subscription_status)
        } else {
          res.sendStatus(404)
        }
      }
    )

    this.app.delete(
      '/api/v1/sharelatex/users/:v1_user_id/subscription',
      (req, res) => {
        const user = this.users[req.params.v1_user_id]
        if (user) {
          user.canceled = true
          res.sendStatus(200)
        } else {
          res.sendStatus(404)
        }
      }
    )

    this.app.post('/api/v1/sharelatex/users/:v1_user_id/sync', (req, res) => {
      this.syncUserFeatures(req.params.v1_user_id)
      res.sendStatus(200)
    })

    this.app.post('/api/v1/sharelatex/exports', (req, res) => {
      this.exportParams = Object.assign({}, req.body)
      res.json({ exportId: this.exportId })
    })

    this.app.get('/api/v2/users/:userId/affiliations', (req, res) => {
      res.json(this.affiliations[req.params.userId] || [])
    })

    this.app.post('/api/v2/users/:userId/affiliations', (req, res) => {
      this.addAffiliation(req.params.userId, req.body.email)
      res.sendStatus(201)
    })

    this.app.delete('/api/v2/users/:userId/affiliations', (req, res) => {
      res.sendStatus(201)
    })

    this.app.delete('/api/v2/users/:userId/affiliations/:email', (req, res) => {
      res.sendStatus(204)
    })

    this.app.get('/api/v2/brands/:slug', (req, res) => {
      let brand
      if ((brand = this.brands[req.params.slug])) {
        res.json(brand)
      } else {
        res.sendStatus(404)
      }
    })

    this.app.get('/universities/list', (req, res) => res.json([]))

    this.app.get('/universities/list/:id', (req, res) =>
      res.json({
        id: parseInt(req.params.id),
        name: `Institution ${req.params.id}`
      })
    )

    this.app.get('/university/domains', (req, res) => res.json([]))

    this.app.put('/api/v1/sharelatex/users/:id/email', (req, res) => {
      const { email } = req.body && req.body.user
      if (this.existingEmails.includes(email)) {
        res.sendStatus(409)
      } else {
        this.updateEmail(parseInt(req.params.id), email)
        res.sendStatus(200)
      }
    })

    this.app.post('/api/v1/sharelatex/login', (req, res) => {
      for (let id in this.users) {
        const user = this.users[id]
        if (
          user &&
          user.email === req.body.email &&
          user.password === req.body.password
        ) {
          return res.json({
            email: user.email,
            valid: true,
            user_profile: user.profile
          })
        }
      }
      res.status(403).json({
        email: req.body.email,
        valid: false
      })
    })

    this.app.get('/api/v2/partners/:partner/conversions/:id', (req, res) => {
      const partner = this.validation_clients[req.params.partner]
      const conversion =
        partner && partner.conversions && partner.conversions[req.params.id]

      if (conversion) {
        res.status(200).json({
          input_file_uri: conversion,
          brand_variation_id: partner.brand_variation_id
        })
      } else {
        res.status(404).json({})
      }
    })

    this.app.get('/api/v2/brand_variations/:id', (req, res) => {
      const variation = this.brand_variations[req.params.id]
      if (variation) {
        res.status(200).json(variation)
      } else {
        res.status(404).json({})
      }
    })

    this.app.get('/api/v1/sharelatex/docs/:token/is_published', (req, res) => {
      return res.json({ allow: true })
    })

    this.app.get(
      '/api/v1/sharelatex/users/:user_id/docs/:token/info',
      (req, res) => {
        const info = this.getDocInfo(req.params.token) || {
          exists: false,
          exported: false
        }
        res.json(info)
      }
    )

    this.app.get(
      '/api/v1/sharelatex/docs/read_token/:token/exists',
      (req, res) => {
        res.json({ exists: false })
      }
    )

    this.app.get('/api/v2/templates/:templateId', (req, res) => {
      const template = this.templates[req.params.templateId]
      if (!template) {
        return res.sendStatus(404)
      }
      res.json(template)
    })
  }
}

module.exports = MockV1Api

// type hint for the inherited `instance` method
/**
 * @function instance
 * @memberOf MockV1Api
 * @static
 * @returns {MockV1Api}
 */
