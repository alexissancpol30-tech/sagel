// functions/api/senadores.js
import { makeCRUD } from './_crud.js';
const { onRequestGet, onRequestPost, onRequestPut, onRequestDelete } = makeCRUD('senadores');
export { onRequestGet, onRequestPost, onRequestPut, onRequestDelete };
