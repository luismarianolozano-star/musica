let listaCanciones = [];
let indiceActual = -1;
const audio = new Audio();
let cancionUrlTemporal = null;

// Evento: Al terminar el audio, pasa a otra canción al azar automáticamente
audio.addEventListener('ended', () => {
    reproducirSiguiente();
});

// Evento: Actualiza el avance de la barra de progreso mientras suena el tema
audio.addEventListener('timeupdate', () => {
    const barra = document.getElementById('barraProgreso');
    const txtActual = document.getElementById('tiempoActual');
    if (audio.duration) {
        barra.value = (audio.currentTime / audio.duration) * 100;
        txtActual.innerText = formatearTiempo(audio.currentTime);
    }
});

// Evento: Detecta la duración total cuando se abre la canción
audio.addEventListener('loadedmetadata', () => {
    document.getElementById('tiempoTotal').innerText = formatearTiempo(audio.duration);
});

// 1. Procesa la carpeta local cargada y dibuja la interfaz de canciones
function cargarCarpeta(evento) {
    const archivos = evento.target.files;
    listaCanciones = [];

    for (let i = 0; i < archivos.length; i++) {
        if (archivos[i].name.endsWith('.mp3') || archivos[i].name.endsWith('.wav') || archivos[i].name.endsWith('.m4a')) {
            listaCanciones.push(archivos[i]);
        }
    }

    document.getElementById('contadorLista').innerText = listaCanciones.length;

    const contenedorLista = document.getElementById('listaCancionesUI');
    contenedorLista.innerHTML = ""; 

    listaCanciones.forEach((cancion, index) => {
        const item = document.createElement('div');
        item.className = 'item-cancion';
        item.id = `cancion-${index}`;
        item.innerText = `${index + 1}. ${cancion.name}`;
        item.onclick = () => reproducirPorIndice(index);
        contenedorLista.appendChild(item);
    });

    if (listaCanciones.length > 0) {
        reproducirSiguiente();
    } else {
        alert("No se encontraron archivos de audio.");
    }
}

// 2. Elige un índice aleatorio y lo manda a reproducir
function reproducirSiguiente() {
    if (listaCanciones.length === 0) return;
    const indiceAlAzar = Math.floor(Math.random() * listaCanciones.length);
    reproducirPorIndice(indiceAlAzar);
}

// 3. Reproduce un tema específico basado en el número de su posición
function reproducirPorIndice(index) {
    if (listaCanciones.length === 0) return;
    
    indiceActual = index;
    const archivoCancion = listaCanciones[indiceActual];

    if (cancionUrlTemporal) {
        URL.revokeObjectURL(cancionUrlTemporal);
    }

    cancionUrlTemporal = URL.createObjectURL(archivoCancion);
    audio.src = cancionUrlTemporal;
    
    audio.play()
        .then(() => {
            document.getElementById('nombreCancion').innerText = archivoCancion.name;
            document.getElementById('btnPlayPause').innerText = "⏸ Pause";
            actualizarListaVisual();
        })
        .catch(err => {
            console.log("Error al reproducir, pasando al siguiente...", err);
            reproducirSiguiente();
        });
}

// 4. Mueve el scroll de la lista y pinta de verde la canción que está sonando
function actualizarListaVisual() {
    const elementos = document.querySelectorAll('.item-cancion');
    elementos.forEach(el => el.classList.remove('activa'));

    const elementoActivo = document.getElementById(`cancion-${indiceActual}`);
    if (elementoActivo) {
        elementoActivo.classList.add('activa');
        elementoActivo.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

// 5. Botón Play/Pause
function alternarPlayPause() {
    if (listaCanciones.length === 0) return;
    if (audio.paused) {
        audio.play();
        document.getElementById('btnPlayPause').innerText = "⏸ Pause";
    } else {
        audio.pause();
        document.getElementById('btnPlayPause').innerText = "▶ Play";
    }
}

// 6. Permite adelantar o atrasar manualmente desde la barra deslizadora
function cambiarTiempoManual() {
    const barra = document.getElementById('barraProgreso');
    if (audio.duration) {
        audio.currentTime = (barra.value / 100) * audio.duration;
    }
}

// 7. Convierte segundos a formato de reloj (MM:SS)
function formatearTiempo(segundos) {
    if (isNaN(segundos)) return "0:00";
    const minutos = Math.floor(segundos / 60);
    const segs = Math.floor(segundos % 60);
    return `${minutos}:${segs < 10 ? "0" + segs : segs}`;
}
