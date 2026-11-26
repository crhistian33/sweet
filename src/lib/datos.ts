// Este archivo lee y revisa marca.json y productos.json.
// Si hay un error, el sitio no se publica y el mensaje dice qué corregir.
// Los estudiantes NO necesitan editar este archivo.
import fs from "node:fs";
import path from "node:path";
import { z } from "astro/zod";
import marcaCruda from "../data/marca.json";
import productosCrudos from "../data/productos.json";

const color = z
  .string()
  .regex(
    /^#[0-9a-fA-F]{6}$/,
    "Escribe el color con # y 6 caracteres, por ejemplo #1F6F5B",
  );
const fuente = z
  .string()
  .regex(
    /^[A-Za-z0-9 ]+$/,
    "Escribe solo el nombre de la fuente, sin símbolos (ejemplo: Poppins)",
  );
const enlaceOpcional = z.union([
  z.literal(""),
  z.string().url("Escribe el enlace completo, con https://"),
]);

const esquemaMarca = z.object({
  nombre: z.string().min(0, "Es muy corto").max(40, "Máximo 40 caracteres"),
  eslogan: z.string().max(80, "Máximo 80 caracteres"),
  logo: z.string().min(1, "Escribe el nombre del archivo del logo"),
  colores: z.object({
    principal: color,
    secundario: color,
    fondo: color,
    texto: color,
  }),
  fuentes: z.object({ titulo: fuente, cuerpo: fuente }),
  esquinas: z.enum(["rectas", "suaves", "redondas"], {
    errorMap: () => ({
      message: "Usa una de estas palabras: rectas, suaves o redondas",
    }),
  }),
  portada: z.object({
    titulo: z.string().min(3, "Es muy corto").max(70, "Máximo 70 caracteres"),
    subtitulo: z.string().max(160, "Máximo 160 caracteres"),
    imagen: z.string().min(1, "Escribe el nombre del archivo de la imagen"),
    textoBoton: z
      .string()
      .min(1, "No puede estar vacío")
      .max(25, "Máximo 25 caracteres"),
    insignia: z.string().max(60, "Máximo 60 caracteres").optional(),
    etiqueta: z.string().max(40, "Máximo 40 caracteres").optional(),
    destaque: z.string().max(50, "Máximo 50 caracteres").optional(),
    enlaceBoton: z.string().max(150, "Máximo 150 caracteres").optional(),
    textoBotonSecundario: z.string().max(30, "Máximo 30 caracteres").optional(),
    enlaceBotonSecundario: z
      .string()
      .max(150, "Máximo 150 caracteres")
      .optional(),
  }),
  nosotros: z.object({
    titulo: z.string().min(2, "Es muy corto").max(40, "Máximo 40 caracteres"),
    texto: z.string().max(500, "Máximo 500 caracteres"),
    puntos: z
      .array(z.string().max(60, "Máximo 60 caracteres"))
      .max(4, "Máximo 4 puntos"),
  }),
  contacto: z.object({
    whatsapp: z
      .string()
      .regex(
        /^51\d{9}$/,
        "Escribe el número con 51 al inicio y 9 dígitos más, sin espacios ni +",
      ),
    mensaje: z.string().max(120, "Máximo 120 caracteres"),
    horario: z.string().max(80, "Máximo 80 caracteres"),
    instagram: enlaceOpcional,
    facebook: enlaceOpcional,
  }),
  tienda: z.object({
    recojo: z
      .string()
      .min(3, "No puede estar vacío")
      .max(120, "Máximo 120 caracteres"),
    ofreceDelivery: z.boolean({
      invalid_type_error: "Escribe true o false, sin comillas",
    }),
    delivery: z.string().max(120, "Máximo 120 caracteres"),
    costoDelivery: z.number().min(0, "No puede ser negativo"),
  }),
  pagos: z.object({
    efectivo: z
      .string()
      .min(3, "No puede estar vacío")
      .max(200, "Máximo 200 caracteres"),
    yapePlin: z.object({
      numero: z
        .string()
        .regex(
          /^9\d{8}$/,
          "Escribe 9 dígitos que empiecen con 9, sin espacios ni +",
        ),
      titular: z
        .string()
        .min(2, "Es muy corto")
        .max(60, "Máximo 60 caracteres"),
      qr: z.string(),
      instrucciones: z.string().max(200, "Máximo 200 caracteres"),
    }),
  }),
});

const esquemaProductos = z
  .array(
    z.object({
      id: z
        .string()
        .regex(
          /^[a-z0-9-]+$/,
          "Usa solo minúsculas, números y guiones, sin espacios (ejemplo: pan-integral)",
        ),
      nombre: z.string().min(2, "Es muy corto").max(50, "Máximo 50 caracteres"),
      descripcion: z.string().max(200, "Máximo 200 caracteres"),
      precio: z.number().positive("El precio debe ser mayor que 0"),
      imagen: z.string().min(1, "Escribe el nombre del archivo de la imagen"),
      etiqueta: z.string().max(20, "Máximo 20 caracteres").optional(),
    }),
  )
  .min(1, "Agrega al menos un producto")
  .max(12, "Máximo 12 productos")
  .superRefine((lista, ctx) => {
    const vistos = new Set<string>();
    lista.forEach((p, i) => {
      if (vistos.has(p.id)) {
        ctx.addIssue({
          code: "custom",
          path: [i, "id"],
          message:
            "Este id ya lo usa otro producto: cada producto necesita uno distinto",
        });
      }
      vistos.add(p.id);
    });
  });

function mensajeDe(issue: z.ZodIssue): string {
  if (issue.code === "invalid_type") {
    if (issue.received === "undefined")
      return "Falta este dato (revisa que exista y esté bien escrito)";
    if (issue.expected === "number")
      return "Debe ser un número, sin comillas (ejemplo: 12.5)";
    if (issue.expected === "string") return "Debe ser texto, entre comillas";
    if (issue.expected === "boolean")
      return "Escribe true o false, sin comillas";
  }
  return issue.message;
}

function revisar<T extends z.ZodTypeAny>(
  esquema: T,
  datos: unknown,
  archivo: string,
): z.infer<T> {
  const resultado = esquema.safeParse(datos);
  if (resultado.success) return resultado.data;
  const lineas = resultado.error.issues.map((i) => {
    const ruta = i.path
      .map((p) => (typeof p === "number" ? `n.º ${p + 1}` : p))
      .join(" → ");
    return `  • ${ruta || "(todo el archivo)"}: ${mensajeDe(i)}`;
  });
  throw new Error(`\n\nHay un error en ${archivo}:\n${lineas.join("\n")}\n`);
}

function existeEnPublic(ruta: string, donde: string) {
  const completa = path.join(process.cwd(), "public", ruta);
  if (!fs.existsSync(completa)) {
    throw new Error(
      `\n\nNo encuentro la imagen "${ruta}" (${donde}).\n` +
        `Revisa que el archivo esté en la carpeta public y que el nombre coincida exactamente ` +
        `(mayúsculas, guiones y extensión).\n`,
    );
  }
}

export type Marca = z.infer<typeof esquemaMarca>;
export type Producto = z.infer<typeof esquemaProductos>[number];

export const marca: Marca = revisar(esquemaMarca, marcaCruda, "marca.json");
export const productos: Producto[] = revisar(
  esquemaProductos,
  productosCrudos,
  "productos.json",
);

existeEnPublic(marca.logo, "logo en marca.json");
existeEnPublic(marca.portada.imagen, "imagen de la portada en marca.json");
if (marca.pagos.yapePlin.qr)
  existeEnPublic(marca.pagos.yapePlin.qr, "QR en marca.json");
productos.forEach((p, i) =>
  existeEnPublic(p.imagen, `producto n.º ${i + 1} en productos.json`),
);

// ---------- Ayudas de color ----------
function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
/** Elige blanco o negro, el que se lea mejor sobre ese color. */
function colorSobre(fondo: string) {
  return contraste("#ffffff", fondo) >= contraste("#14181c", fondo)
    ? "#ffffff"
    : "#14181c";
}

const { colores } = marca;
if (contraste(colores.texto, colores.fondo) < 4.5) {
  console.warn(
    '\n⚠ Los colores "texto" y "fondo" casi no contrastan: el texto se leerá con dificultad. ' +
      "Usa un texto muy oscuro sobre un fondo claro (o al revés).\n",
  );
}

const radios = { rectas: "0px", suaves: "10px", redondas: "24px" } as const;

/** Variables CSS que se aplican a toda la página. */
export const estiloVars = [
  `--principal:${colores.principal}`,
  `--secundario:${colores.secundario}`,
  `--fondo:${colores.fondo}`,
  `--texto:${colores.texto}`,
  `--sobre-principal:${colorSobre(colores.principal)}`,
  `--sobre-secundario:${colorSobre(colores.secundario)}`,
  `--radio:${radios[marca.esquinas]}`,
  `--f-titulo:'${marca.fuentes.titulo}'`,
  `--f-cuerpo:'${marca.fuentes.cuerpo}'`,
].join(";");

// ---------- Fuentes de Google ----------
const familia = (n: string) =>
  `family=${n.trim().replace(/ /g, "+")}:wght@400;700`;
export const urlFuentes = `https://fonts.googleapis.com/css2?${familia(marca.fuentes.titulo)}&${familia(
  marca.fuentes.cuerpo,
)}&display=swap`;

// Al publicar, avisa si la fuente no existe o no tiene Regular y Negrita.
try {
  const r = await fetch(urlFuentes, { signal: AbortSignal.timeout(5000) });
  if (r.status === 400 || r.status === 404) {
    throw new Error(
      `\n\nLa fuente "${marca.fuentes.titulo}" o "${marca.fuentes.cuerpo}" no está disponible en Google Fonts ` +
        `con Regular y Negrita. Revisa el nombre o elige otra fuente.\n`,
    );
  }
} catch (e) {
  if (e instanceof Error && e.message.includes("Google Fonts")) throw e;
  // Sin internet en este momento: no se bloquea la publicación.
}

// ---------- Utilidades para las páginas ----------
/** Ruta correcta de un archivo de la carpeta public (funciona en GitHub Pages). */
export const url = (ruta: string) =>
  `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${ruta.replace(/^\//, "")}`;

export const precio = (n: number) => `S/ ${n.toFixed(2)}`;

export const enlaceWhatsApp = (numero: string, mensaje: string) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

export const rutas = {
  inicio: url(""),
  carrito: url("carrito/"),
  checkout: url("checkout/"),
  confirmacion: url("confirmacion/"),
};

/** Datos que usa el carrito en el navegador (el JavaScript de la tienda). */
export const configTienda = {
  clave: import.meta.env.BASE_URL || "/",
  nombre: marca.nombre,
  productos: productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    imagen: url(p.imagen),
  })),
  rutas,
  whatsapp: marca.contacto.whatsapp,
  tienda: marca.tienda,
  pagos: marca.pagos,
};
