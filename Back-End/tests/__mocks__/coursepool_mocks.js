const payload_create = {
  name: 'Basic & Natural Sciences'
};

const payload_create_empty = {
  name: ''
};

const payload_get = {
  course_pool_id: '2',
};

const payload_update = {
  id: '1',
  name: 'Updated Pool',
};

const payload_delete = {
  course_pool_id: '3',
};

const response_getall = {
  course_pools: [{id: 'ppol id', name: 'pool name'}]
};

const response_get = {
  id: 'pool id',
  name: 'pool name'
};

const coursepool_mocks = {
  payload_create,
  payload_create_empty,
  payload_get,
  payload_update,
  payload_delete,
  response_getall,
  response_get
};

module.exports = coursepool_mocks;