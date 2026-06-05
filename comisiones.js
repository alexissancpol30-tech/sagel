// functions/api/comisiones.js
import { makeCRUD } from './_crud.js';
const { onRequestGet, onRequestPost, onRequestPut, onRequestDelete } = makeCRUD('comisiones');
export { onRequestGet, onRequestPost, onRequestPut, onRequestDelete };
