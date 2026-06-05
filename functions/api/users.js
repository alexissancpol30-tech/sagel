// functions/api/users.js
import { makeCRUD } from './_crud.js';
const { onRequestGet, onRequestPost, onRequestPut, onRequestDelete } = makeCRUD('users');
export { onRequestGet, onRequestPost, onRequestPut, onRequestDelete };
