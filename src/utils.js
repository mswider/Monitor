function copy(obj) {
  return Object.assign({}, ...Object.entries(obj).map(([k, v]) => ({[k]: {...v}})));
}
function post(url, obj) {
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
  return fetch(url, options);
}

export { copy, post };