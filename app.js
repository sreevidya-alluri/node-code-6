const express = require('express')
const path = require('path')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const dbPath = path.join(__dirname, 'covid19India.db')
let db = null
app.use(express.json())

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => console.log('Success'))
  } catch (e) {
    console.log(`DB Error : ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

const convertStateDbObjectToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const convertDistrictDbObjectToResponseObject = dbObject => {
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

app.get('/states/', async (request, response) => {
  const getStatesQuery = `SELECT * FROM state`
  const stateArray = await db.all(getStatesQuery)
  response.send(
    stateArray.map(eachState =>
      convertStateDbObjectToResponseObject(eachState),
    ),
  )
})

app.get('/state/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
    SELECT * FROM state 
    WHERE state_id=${stateId};
  `
  const state = await db.get(getStateQuery)
  response.send(convertStateDbObjectToResponseObject(state))
})

app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const addDistrict = `INSERT
   INTO 
   district (district_name,state_id,cases,cured,active,deaths)
  VALUES(
    '${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths},
  )`
  await db.run(addDistrict)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictId = `
  SELECT * FROM district WHERE district_id=${districtId}`
  const district = await db.get(getDistrictId)
  response.send(convertDistrictDbObjectToResponseObject(district))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteQuery = `DELETE FROM district WHERE district_id = ${districtId}`
  await db.run(deleteQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const updateDistrictDetails = `
    UPDATE district
    SET 
    district_name = '${districtName}' , 
    state_id = ${stateId}, 
    cases = ${cases},
     cured = ${cured}, 
     active = ${active},
    deaths=${deaths}
    WHERE district_id = ${districtId}
  `
  await db.run(updateDistrictDetails)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getstatsQuery = `SELECT 
    SUM(cases) as totalCases,
    SUM(cured) as totalCured,
    SUM(active) as totalActive,
    SUM(deaths) as totalDeaths
  FROM district 
  WHERE state_id = ${stateId};
   `
  const district = await db.get(getstatsQuery)
  //console.log(stats)
  response.send(district)
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictIdQuery = `
  SELECT state_name AS state_name
   FROM district
  INNER JOIN state 
  ON district.state_id=state.state_id
  WHERE district_id=${districtId};`
  const stateName = await db.get(getDistrictIdQuery)
  response.send(stateName)
})

module.exports = app
