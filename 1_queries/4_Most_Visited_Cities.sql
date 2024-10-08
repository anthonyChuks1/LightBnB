SELECT
  properties.city,
  count(reservations) as total_reservations
FROM
  properties
  JOIN reservations on reservations.property_id = properties.id
GROUP BY
  properties.city
ORDER BY
  total_reservations desc;