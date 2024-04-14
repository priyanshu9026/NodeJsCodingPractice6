const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const dbPath = path.join(__dirname, 'covid19India.db')
const app = express()

app.use(express.json())

let db = null

const convertStateObjToResponseObj = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const convertDistrictObjToResponseObj = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

const reportSnakeToCamelCase = dbObject => {
  return {
    totalCases: dbObject.cases,
    totalCured: dbObject.cured,
    totalActive: dbObject.active,
    totalDeaths: dbObject.deaths,
  }
}

const initializeDBAndServer = async () => {
  try {
    db = await open({filename: dbPath, driver: sqlite3.Database})
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(-1)
  }
}
initializeDBAndServer()

app.get('/states/', async (request, response) => {
  const getStateQuery = `
    SELECT 
    *
    FROM 
    state
    ORDER BY state_id;`
  const statesArray = await db.all(getStateQuery)
  const statesResult = statesArray.map(eachState => {
    return convertStateObjToResponseObj(eachState)
  })
  response.send(statesResult)
})
app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
     SELECT 
    *
    FROM 
    state
    WHERE
    state_id = ${stateId};
    `
  const state = await db.get(getStateQuery)
  response.send(convertStateObjToResponseObj(state))
})

app.post('/districts/', async (request, response) => {
  const {stateId, districtName, cases, cured, active, deaths} = request.body
  const postDistrictQuery = `
  INSERT INTO
  district (state_id, district_name, cases, cured, active, deaths)
  VALUES
  (${stateId},'${districtName}',${cases},${cured},${active},${deaths});`

  const addDistrict = await db.run(postDistrictQuery)
  const districtId = addDistrict.lastId
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrict = `
     SELECT 
      *
    FROM 
      district
    WHERE
      district_id = ${districtId};
  `
  const district = await db.get(getDistrict)
  const districtResult = convertDistrictObjToResponseObj(district)
  response.send(districtResult)
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrictQuery = `
      DELETE FROM 
      district
      WHERE
      district_id = ${districtId}`

  await db.run(deleteDistrictQuery)
  response.send('District Removed')
})
app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {
    districtName,

    stateId,
    cases,
    cured,
    active,
    deaths,
  } = request.body
  const updateDistrictQuery = `
    UPDATE
        district
    SET
        district_name = '${districtName}',
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths}
    WHERE 
        district_id = ${districtId};
    `
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStateStatsQuery = `
    SELECT
      SUM(cases) AS cases,
      SUM(cured) AS cured,
      SUM(active) AS active,
      SUM(deaths) AS deaths
    FROM 
      district
    WHERE
      state_id=${stateId};`
  const stats = await db.get(getStateStatsQuery)
  const resultReport = reportSnakeToCamelCase(stats)
  response.send(resultReport)
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const stateDetails = `
     SELECT 
      state_name
    FROM 
      state JOIN district
      ON state.state_id = district.state_id
    WHERE
      district.district_id = ${districtId};
  `
  const ststeName = await db.get(stateDetails)
  response.send({stateName: ststeName.state_name})
})

module.exports = app
