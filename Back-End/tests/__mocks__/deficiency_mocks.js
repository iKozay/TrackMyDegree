const payload_create = {
  coursepool: '1',
  user_id: '1',
  creditsRequired: 120,
};

const payload_getall = {
  user_id: '2',
};

const payload_delete = payload_create;

const response_getall = {
  id: 'def id',
  ...payload_create
}

const def_mocks = {
  payload_create,
  payload_getall,
  payload_delete,
  response_getall
};

module.exports = def_mocks;