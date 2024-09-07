const { Pool } = require("pg");
const properties = require("./json/properties.json");
//const users = require("./json/users.json");

const pool = new Pool({
  user: "labber",
  password: "labber",
  host: "localhost",
  database: "lightbnb",
});

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryRequest = `
  SELECT  
    id,
    name,
    email,
    password 
  FROM 
    users
  WHERE email LIKE $1;
  `;
  return pool
    .query(queryRequest, [`%${email}%`])
    .then((result) => {
      if (result.rows.length) {
        return result.rows[0];
      }
      return null;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryRequest = `
    SELECT  
    id, name, email, password
    FROM 
    users
    WHERE id = $1;
    `;
  return pool
    .query(queryRequest, [id])
    .then((result) => {
      if (result.rows.length) {
        return result.rows[0];
      }
      return null;
    })
    .catch((err) => {
      return err.message;
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const queryRequest = `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
  return pool
    .query(queryRequest, [user.name, user.email, user.password])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      return err.message;
    });
};
/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryRequest = `
  SELECT
  reservations.id,
  properties.title,
  properties.cost_per_night,
  reservations.start_date,
  avg(rating) as average_rating
FROM
  reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
WHERE
  reservations.guest_id = $1
GROUP BY
  properties.id,
  reservations.id
ORDER BY
  reservations.start_date
LIMIT
  $2;
  `;
  return pool
    .query(queryRequest, [guest_id, limit])
    .then((result) => {
      console.log(result.rows);
      return result.rows;
    })
    .catch((err) => {
      // console.log(err.message);
      return err.message;
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  const queryParams = [];

  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
     FROM properties
     JOIN property_reviews ON properties.id = property_id
      `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += ` WHERE city LIKE $${queryParams.length} `;
  } else {
    queryString += ` WHERE 1 = 1`;
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += ` AND owner_id = $${queryParams.length}`;
  }
  if (options.minimum_price_per_night) {
    const minPrice = Number(options.minimum_price_per_night) * 100;
    queryParams.push(minPrice);
    queryString += ` AND cost_per_night >= $${queryParams.length}`;
  }
  if (options.maximum_price_per_night) {
    const maxPrice = Number(options.maximum_price_per_night) * 100;
    queryParams.push(maxPrice);
    queryString += ` AND cost_per_night <= $${queryParams.length}`;
  }
  queryString += ` GROUP BY properties.id`;
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += ` HAVING avg(property_reviews.rating) >= $${queryParams.length}`;
  }

  queryParams.push(limit);
  queryString += `
      ORDER BY cost_per_night
      LIMIT $${queryParams.length};
      `;

  console.log(queryString, queryParams);

  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log("Query error", err.message);
      return [];
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  
  //add the key as the sql table labels
  let queryString = `
    INSERT INTO properties (
      owner_id, title, description, thumbnail_photo_url, cover_photo_url, 
      cost_per_night, street, city, province, post_code, country, 
      parking_spaces, number_of_bathrooms, number_of_bedrooms
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    ) RETURNING *;
  `;
  

  const propertyValues = {
    owner_id: property.owner_id || NULL,
    title: property.title || NULL,
    description: property.description || '',
    thumbnail_photo_url: property.thumbnail_photo_url || '',
    cover_photo_url: property.cover_photo_url || '',
    cost_per_night: property.cost_per_night || 0,
    street: property.street || NULL,
    city: property.city || NULL,
    province: property.province || NULL,
    post_code: property.post_code || NULL,
    country: property.country || NULL,
    parking_spaces: property.parking_spaces || 0,
    number_of_bathrooms: property.number_of_bathrooms || 0,
    number_of_bedrooms: property.number_of_bedrooms || 0,
  };

  
  const queryParams = [
    propertyValues.owner_id,
    propertyValues.title,
    propertyValues.description,
    propertyValues.thumbnail_photo_url,
    propertyValues.cover_photo_url,
    propertyValues.cost_per_night*100,
    propertyValues.street,
    propertyValues.city,
    propertyValues.province,
    propertyValues.post_code,
    propertyValues.country,
    propertyValues.parking_spaces,
    propertyValues.number_of_bathrooms,
    propertyValues.number_of_bedrooms,
  ];
  console.log(queryString, queryParams);
  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.error('Query error:', err.message);
      return err.message;
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
// Property
// {
//   owner_id: int,
//   title: string,
//   description: string,
//   thumbnail_photo_url: string,
//   cover_photo_url: string,
//   cost_per_night: string,
//   street: string,
//   city: string,
//   province: string,
//   post_code: string,
//   country: string,
//   parking_spaces: int,
//   number_of_bathrooms: int,
//   number_of_bedrooms: int
// }
