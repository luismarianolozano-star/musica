// Elementos de la interfaz (DOM)
const inputCarpeta = document.getElementById('inputCarpeta');
const inputArchivos = document.getElementById('inputArchivos');
const btnPlayPausa = document.getElementById('btnPlayPausa');
const btnSiguiente = document.getElementById('btnSiguiente');
const btnAleatorio = document.getElementById('btnAleatorio');
const btnLimpiar = document.getElementById('btnLimpiar');
const listaCancionesUI = document.getElementById('listaCanciones');
const barraProgreso = document.getElementById('barraProgreso');
const progresoContenedor = document.getElementById('progresoContenedor');
const tiempoTxt = document.getElementById('tiempo');

// Variables de estado del reproductor
let playlist = []; 
let indiceActual = 0;
let esAleatorio = true;
const reproductor = new Audio();
let db;

// --- 1. CONFIGURACIÓN DE LA BASE DE DATOS LOCAL (IndexedDB) ---
const request = indexedDB.open("ReproductorMusicaDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("canciones")) {
        db.createObjectStore("canciones", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    cargarListaDesdeDB(); 
};

// --- 2. CAPTURA DE ARCHIVOS DE AUDIO ---
inputCarpeta.addEventListener('change', (e) => {
    const archivos = Array.from(e.target.files).filter(file => file.type.startsWith('audio/'));
    guardarYAgregarArchivos(archivos);
});

inputArchivos.addEventListener('change', (e) => {
    const archivos = Array.from(e.target.files);
    guardarYAgregarArchivos(archivos);
    inputArchivos.value = ""; 
});

// --- 3. PROCESAMIENTO Y MEMORIA ---
function guardarYAgregarArchivos(nuevosArchivos) {
    if (nuevosArchivos.length === 0) return;
    const tx = db.transaction("canciones", "readwrite");
    const store = tx.objectStore("canciones");

    nuevosArchivos.forEach(archivo => {
        const item = { nombre: archivo.name, fileData: archivo };
        const req = store.add(item);
        req.onsuccess = (e) => {
            playlist.push({ id: e.target.result, nombre: archivo.name, fileData: archivo });
            actualizarInterfazLista();
            if (playlist.length === 1) prepararCancion(0);
        };
    });
}

function cargarListaDesdeDB() {
    const tx = db.transaction("canciones", "readonly");
    const store = tx.objectStore("canciones");
    const req = store.getAll();

    req.onsuccess = () => {
        playlist = req.result;
        if (playlist.length > 0) {
            actualizarInterfazLista();
            indiceActual = parseInt(localStorage.getItem('ultimoIndice')) || 0;
            if (indiceActual >= playlist.length) indiceActual = 0;
            prepararCancion(indiceActual);
        }
    };
}

// --- 4. CONTROLADOR DE INTERFAZ GRÁFICA ---
function actualizarInterfazLista() {
    listaCancionesUI.innerHTML = "";
    playlist.forEach((cancion, indice) => {
        const li = document.createElement('li');
        if (indice === indiceActual) li.classList.add('activo');
        
        const spanNombre = document.createElement('span');
        spanNombre.textContent = cancion.nombre;
        spanNombre.classList.add('nombre-cancion');
        spanNombre.addEventListener('click', () => reproducirCancion(indice));
       
        const spanBorrar = document.createElement('span');
        spanBorrar.textContent = "×";
        spanBorrar.classList.add('btn-borrar');
        spanBorrar.addEventListener('click', (e) => {
            e.stopPropagation();
            eliminarCancion(cancion.id, indice);
        });

        li.appendChild(spanNombre);
        li.appendChild(spanBorrar);
        listaCancionesUI.appendChild(li);
    });
}

// --- 5. LÓGICA DE REPRODUCCIÓN Y BOTONES ---
function prepararCancion(indice) {
    if (playlist.length === 0) return;
    indiceActual = indice;
    const archivoUrl = URL.createObjectURL(playlist[indice].fileData);
    reproductor.src = archivoUrl;
    localStorage.setItem('ultimoIndice', indice);
    document.getElementById('nombreCancion').innerText = playlist[indice].fileData.name;
    actualizarInterfazLista();
}

function reproducirCancion(indice) {
    prepararCancion(indice);
    reproductor.play();
   
    btnPlayPausa.textContent = "⏸ Pausa";
}

// Control del botón Play / Pausa
btnPlayPausa.addEventListener('click', () => {
    if (playlist.length === 0) return;
    
    if (reproductor.paused) {
        reproductor.play();
        btnPlayPausa.textContent = "⏸ Pausa";
    } else {
        reproductor.pause();
        btnPlayPausa.textContent = "▶ Play";
    }
});

// Control del botón Siguiente
btnSiguiente.addEventListener('click', () => {
    siguienteTrack();
});

function siguienteTrack() {
    if (playlist.length === 0) return;

    if (esAleatorio) {
        let indiceRandom = Math.floor(Math.random() * playlist.length);
        reproducirCancion(indiceRandom);
    } else {
        let siguiente = (indiceActual + 1) % playlist.length;
        reproducirCancion(siguiente);
    }
}

// Cuando la canción termina de forma natural
reproductor.addEventListener('ended', () => {
    siguienteTrack();
});

// --- 6. BARRA DE PROGRESO ---
reproductor.addEventListener('timeupdate', () => {
    if (reproductor.duration) {
        const porcentaje = (reproductor.currentTime / reproductor.duration) * 100;
        barraProgreso.style.width = `${porcentaje}%`;
        tiempoTxt.textContent = `${formatearTiempo(reproductor.currentTime)} / ${formatearTiempo(reproductor.duration)}`;
    }
});

progresoContenedor.addEventListener('click', (e) => {
    if (!reproductor.duration) return;
    const clickX = e.offsetX;
    const anchoTotal = progresoContenedor.clientWidth;
    reproductor.currentTime = (clickX / anchoTotal) * reproductor.duration;
});

function formatearTiempo(segundos) {
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
}

// --- 7. MODOS EXTRA Y LIMPIEZA ---
btnAleatorio.addEventListener('click', () => {
    esAleatorio = !esAleatorio;
    btnAleatorio.textContent = ` ${esAleatorio ? '🔀 (Activo)' : '➡️ (Secuencial)'}`;
});

function eliminarCancion(id, indice) {
    const tx = db.transaction("canciones", "readwrite");
    tx.objectStore("canciones").delete(id);

    playlist.splice(indice, 1);
    if (indiceActual === indice) {
        if (playlist.length > 0) {
            reproducirCancion(indiceActual % playlist.length);
        } else {
            reproductor.src = "";
            btnPlayPausa.textContent = "▶ Play";
        }
    } else if (indiceActual > indice) {
        indiceActual--;
        localStorage.setItem('ultimoIndice', indiceActual);
    }
    actualizarInterfazLista();
}

btnLimpiar.addEventListener('click', () => {
    const tx = db.transaction("canciones", "readwrite");
    tx.objectStore("canciones").clear();
    playlist = [];
    indiceActual = 0;
    reproductor.src = "";
    btnPlayPausa.textContent = "▶ Play";
    localStorage.removeItem('ultimoIndice');
    actualizarInterfazLista();
    barraProgreso.style.width = "0%";
    tiempoTxt.textContent = "0:00 / 0:00";
});
