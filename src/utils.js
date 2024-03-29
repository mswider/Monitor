function copy(obj) {
  return Object.assign({}, ...Object.entries(obj).map(([k, v]) => ({[k]: {...v}})));
}
function post(url, obj, headers = {}) {
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(obj)
  };
  return fetch(url, options);
}
function initials(name) {
  return name.split(' ').reduce((a, b) => a + b[0].toUpperCase(), '');
}

export { copy, post, initials };