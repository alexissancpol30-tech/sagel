// functions/api/minutas.js
import { makeCRUD } from './_crud.js';
const { onRequestGet, onRequestPost, onRequestPut, onRequestDelete } = makeCRUD('minutas');
export { onRequestGet, onRequestPost, onRequestPut, onRequestDelete };
