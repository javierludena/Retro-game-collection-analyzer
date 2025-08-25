/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";

// Make xlsx library available from the script tag in index.html
declare var XLSX: any;

// --- Interfaces for collection data ---
interface GameData {
    titulo: string;
    plataforma: string;
    genero: string;
    ano: number;
    precio_compra: number;
    estado: string;
    rareza: string;
    // Market prices for expert analysis
    precio_loose?: number;
    precio_cib?: number;
    precio_nuevo?: number;
}

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

// --- Error types ---
class FileError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FileError';
    }
}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

class APIError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'APIError';
    }
}

// --- Interfaces for API response ---
interface Recommendation {
    game: string;
    platform: string;
    reason: string;
}
interface SellRecommendation extends Recommendation {
    estimated_sale_price: number;
}
interface KeepRecommendation extends Recommendation {
    estimated_future_value: number;
}
interface BuyRecommendation extends Recommendation {
    target_price: number;
}
interface PlatformDistribution {
    platform: string;
    count: number;
    total_value: number;
    average_value: number;
}
interface FutureValueGame {
    game: string;
    current_price_range: string;
}
interface ConsoleFocus {
    platform: string;
    reason: string;
    future_value_games: FutureValueGame[];
}
interface AnalysisResponse {
    summary: {
        total_games: number;
        estimated_collection_value: number;
        predominant_decade: string;
        platform_distribution: PlatformDistribution[];
    };
    console_focus: ConsoleFocus;
    sell_recommendations: SellRecommendation[];
    keep_recommendations: KeepRecommendation[];
    buy_recommendations: BuyRecommendation[];
}


let filesToUpload: FileList | null = null;

document.addEventListener('DOMContentLoaded', () => {
    setupInputTabs();
    setupFileDropArea();
    setupAnalyzeButton();
    setupRecommendationTabs();
    setupRestartButtons();
    updateAnalyzeButtonState(); // Initial state
});

function setupInputTabs() {
    const tabFile = document.getElementById('tab-file');
    const tabManual = document.getElementById('tab-manual');
    const fileContent = document.getElementById('file-content');
    const manualContent = document.getElementById('manual-content');

    tabFile?.addEventListener('click', () => {
        tabFile.classList.add('active');
        tabFile.setAttribute('aria-selected', 'true');
        tabManual?.classList.remove('active');
        tabManual?.setAttribute('aria-selected', 'false');

        if (fileContent) fileContent.classList.add('active');
        if (manualContent) manualContent.classList.remove('active');
        updateAnalyzeButtonState();
    });

    tabManual?.addEventListener('click', () => {
        tabManual.classList.add('active');
        tabManual.setAttribute('aria-selected', 'true');
        tabFile?.classList.remove('active');
        tabFile?.setAttribute('aria-selected', 'false');

        if (manualContent) manualContent.classList.add('active');
        if (fileContent) fileContent.classList.remove('active');
        updateAnalyzeButtonState();
    });
}

function setupFileDropArea() {
    const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
    const fileDropArea = document.querySelector('.file-drop-area') as HTMLElement | null;
    const fileMsg = document.querySelector('.file-msg') as HTMLElement | null;

    if (!fileDropArea || !fileInput || !fileMsg) return;

    fileDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropArea.classList.add('dragover');
    });

    fileDropArea.addEventListener('dragleave', () => {
        fileDropArea.classList.remove('dragover');
    });

    fileDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropArea.classList.remove('dragover');
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            fileInput.files = files;
            handleFileSelect(files);
        }
    });

    fileDropArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        const files = fileInput.files;
        if (files && files.length > 0) {
            handleFileSelect(files);
        }
    });
}

function handleFileSelect(files: FileList) {
    filesToUpload = files;
    const fileMsg = document.querySelector('.file-msg') as HTMLElement | null;
    if (fileMsg) {
        fileMsg.textContent = files[0].name;
    }
    updateAnalyzeButtonState();
}

function updateAnalyzeButtonState() {
    const analyzeButton = document.getElementById('analyze-button') as HTMLButtonElement | null;
    if (!analyzeButton) return;

    const activeTab = document.querySelector('.tab-button.active')?.id;
    const manualInput = document.getElementById('manual-input') as HTMLTextAreaElement | null;

    let enabled = false;
    if (activeTab === 'tab-file' && filesToUpload && filesToUpload.length > 0) {
        enabled = true;
    } else if (activeTab === 'tab-manual' && manualInput && manualInput.value.trim().length > 0) {
        enabled = true;
    }
    analyzeButton.disabled = !enabled;
}


function setupAnalyzeButton() {
    const analyzeButton = document.getElementById('analyze-button');
    analyzeButton?.addEventListener('click', analyzeCollection);

    const manualInput = document.getElementById('manual-input');
    manualInput?.addEventListener('input', updateAnalyzeButtonState);
}

function setupRecommendationTabs() {
    const tabs = document.querySelectorAll('.recommendation-tab-button');
    const contents = document.querySelectorAll('.recommendation-list');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = (tab as HTMLElement).dataset.tab;

            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            contents.forEach(content => {
                if (content.id === targetId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
}

function setupRestartButtons() {
    document.querySelectorAll('.restart-button').forEach(button => {
        button.addEventListener('click', resetApp);
    });
}

async function analyzeCollection() {
    showLoading();
    try {
        // Validate API key first
        await validateAPIKey();
        
        updateLoadingProgress(20, "Validando datos de la colección...");
        const collectionData = await getCollectionData();
        
        updateLoadingProgress(40, "Preparando análisis con IA...");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
        Eres un experto tasador y analista de videojuegos retro especializado en inversiones y coleccionismo estratégico.

        PERSPECTIVA COLECCIONISTA A LARGO PLAZO:

        FACTORES DE REVALORIZACIÓN:
        - Géneros premium: Survival Horror, RPGs únicos, exclusivos de consola
        - Temática oscura/madura: Terror, suspenso, narrativas complejas
        - Juegos anteriores a 2010: Mayor valor nostálgico y coleccionista
        - Desarrolladores prestigiosos y estudios cerrados
        - Ediciones especiales, limitadas o con extras físicos
        - Accesorios únicos, periféricos raros, hardware especial
        - Juegos con culto posterior o redescubrimiento crítico
        - IMPORTANCIA HISTÓRICA: Juegos que definieron géneros, fueron pack-in legendarios, o salvaron consolas del fracaso
        - VALOR CULTURAL: Títulos que trascendieron el gaming y se volvieron fenómenos culturales

        ANÁLISIS ESTRATÉGICO:
        1. VENDER: Juegos comunes, deportivos anuales, o duplicados sin valor sentimental
        2. GUARDAR: Exclusivos, géneros nicho, desarrolladores clave, ediciones especiales
        3. COMPRAR: Completar series icónicas, accesorios raros, oportunidades de mercado

        CONSIDERA: Nostalgia generacional, remasters que impulsan originales, tendencias retrogaming

        ESTRATEGIA LOOSE→CIB: Para juegos valiosos sueltos, evalúa si merece la pena invertir en completarlos. Criterios:
        - Diferencia precio_cib - precio_loose < 100% del precio_loose
        - Juego de alto valor nostálgico o coleccionista
        - Serie icónica o desarrollador prestigioso
        - Mayor liquidez futura del formato CIB
        
        DATOS ESTRUCTURADOS DE LA COLECCIÓN (JSON):
        ${collectionData}
        
        Los datos incluyen para cada juego:
        - titulo, plataforma, genero, año, estado, rareza
        - precio_compra: Lo que pagaste por el juego (YourPrice en el CSV original)
        - precio_loose, precio_cib, precio_nuevo: Precios actuales del mercado para cartucho suelto, completo en caja, y nuevo precintado respectivamente
        
        IMPORTANTE: Los precios de mercado YA ESTÁN INCLUIDOS en los datos (precio_loose, precio_cib, precio_nuevo). NO busques ni consultes precios adicionales. Usa únicamente estos datos para tus recomendaciones comparando precio_compra vs precios de mercado actuales.

        CRITERIOS DE RECOMENDACIÓN:

        VENDER - Solo si:
        • Juego común con alta disponibilidad
        • Ya tienes duplicados o versiones superiores
        • Precio actual cerca del pico histórico

        GUARDAR - Prioriza:
        • Juegos con temática oscura/madura (terror, suspenso)
        • Títulos exclusivos de la plataforma original
        • Desarrolladores prestigiosos o estudios cerrados
        • Ediciones especiales con extras físicos
        • RPGs únicos y aventuras narrativas
        • Hardware especial y accesorios raros
        • Juegos anteriores a 2010 con buena reputación
        • JUEGOS ICÓNICOS: Títulos que definieron consolas o géneros (ej: Tetris para Game Boy, Mario para Nintendo, etc.)
        • PACKS LEGENDARIOS: Combinaciones históricas como Game Boy DMG + Tetris que marcaron época

        COMPRAR - Busca:
        • Completar series icónicas o desarrolladores clave
        • Géneros nicho con crecimiento (JRPGs, survival horror)
        • Accesorios oficiales descontinuados
        • Ediciones especiales infravaloradas
        • CONVERSIÓN LOOSE→CIB: Si tienes juego suelto de gran valor, recomienda comprar caja+manual por separado cuando la diferencia precio_cib - precio_loose sea razonable (menos del 100% del loose)

        FORMATO DE RESPUESTA REQUERIDO:
        Responde ÚNICAMENTE con un objeto JSON válido que contenga:
        - summary: resumen con total_games, estimated_collection_value, predominant_decade, platform_distribution
        - console_focus: plataforma recomendada con razón y juegos con potencial
        - sell_recommendations: array de juegos a vender con estimated_sale_price
        - keep_recommendations: array de juegos a mantener con estimated_future_value  
        - buy_recommendations: array de juegos a comprar con target_price
        
        NO incluyas texto explicativo antes o después del JSON. SOLO el objeto JSON válido.
        Todas las monedas en Euros (€) como números decimales.
        `;
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                summary: {
                    type: Type.OBJECT,
                    properties: {
                        total_games: { type: Type.INTEGER },
                        estimated_collection_value: { type: Type.NUMBER },
                        predominant_decade: { type: Type.STRING },
                        platform_distribution: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    platform: { type: Type.STRING },
                                    count: { type: Type.INTEGER },
                                    total_value: { type: Type.NUMBER },
                                    average_value: { type: Type.NUMBER },
                                }
                            }
                        }
                    }
                },
                console_focus: {
                    type: Type.OBJECT,
                    properties: {
                        platform: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        future_value_games: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    game: { type: Type.STRING },
                                    current_price_range: { type: Type.STRING },
                                }
                            }
                        }
                    }
                },
                sell_recommendations: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            game: { type: Type.STRING },
                            platform: { type: Type.STRING },
                            reason: { type: Type.STRING },
                            estimated_sale_price: { type: Type.NUMBER },
                        }
                    }
                },
                keep_recommendations: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            game: { type: Type.STRING },
                            platform: { type: Type.STRING },
                            reason: { type: Type.STRING },
                            estimated_future_value: { type: Type.NUMBER },
                        }
                    }
                },
                buy_recommendations: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            game: { type: Type.STRING },
                            platform: { type: Type.STRING },
                            reason: { type: Type.STRING },
                            target_price: { type: Type.NUMBER },
                        }
                    }
                }
            }
        };


        updateLoadingProgress(30);

        // Gradual progress simulation during AI processing
        let currentProgress = 30;
        const messageInterval = setInterval(() => {
            // Slow gradual progress from 30% to 65%
            currentProgress = Math.min(65, currentProgress + Math.random() * 3 + 1);
            updateLoadingProgress(Math.floor(currentProgress));
        }, 2000);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        clearInterval(messageInterval);
        updateLoadingProgress(75, "Procesando respuesta...");

        console.log('Raw AI response:', response.text);
        
        let analysisResult: AnalysisResponse;
        try {
            analysisResult = JSON.parse(response.text);
            console.log('Parsed analysis result:', analysisResult);
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', parseError);
            console.log('Response text:', response.text);
            throw new Error('La IA no devolvió un formato válido de respuesta');
        }

        updateLoadingProgress(90, "Preparando resultados...");
        await new Promise(resolve => setTimeout(resolve, 500)); // Small pause
        updateLoadingProgress(100, "¡Análisis completo!");
        setTimeout(() => displayDashboard(analysisResult), 500);

    } catch (error) {
        console.error("Error during analysis:", error);
        handleAnalysisError(error);
    }
}

async function getCollectionData(): Promise<string> {
    const activeTab = document.querySelector('.tab-button.active')?.id;
    
    if (activeTab === 'tab-file' && filesToUpload) {
        const file = filesToUpload[0];
        
        // Validate file before processing
        validateFile(file);
        
        const gameData = await parseFileToGameData(file);
        const validation = validateGameData(gameData);
        
        if (!validation.isValid) {
            throw new ValidationError(`Errores en los datos:\n${validation.errors.join('\n')}`);
        }
        
        if (validation.warnings.length > 0) {
            console.warn('Advertencias en los datos:', validation.warnings);
        }
        
        // Convert to structured JSON for AI
        return JSON.stringify({
            games: gameData,
            total_count: gameData.length,
            validation_summary: {
                errors: validation.errors.length,
                warnings: validation.warnings.length
            }
        });
        
    } else if (activeTab === 'tab-manual') {
        const manualInput = document.getElementById('manual-input') as HTMLTextAreaElement | null;
        const csvText = manualInput?.value.trim() ?? '';
        
        if (!csvText) {
            throw new ValidationError('Por favor, ingresa los datos de tu colección.');
        }
        
        const gameData = parseCSVToGameData(csvText);
        const validation = validateGameData(gameData);
        
        if (!validation.isValid) {
            throw new ValidationError(`Errores en los datos:\n${validation.errors.join('\n')}`);
        }
        
        return JSON.stringify({
            games: gameData,
            total_count: gameData.length,
            validation_summary: {
                errors: validation.errors.length,
                warnings: validation.warnings.length
            }
        });
    }
    
    throw new ValidationError('Por favor, proporciona datos de tu colección.');
}

// File validation function
function validateFile(file: File): void {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_EXTENSIONS = ['.xlsx', '.csv', '.xls'];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        throw new FileError(`El archivo es demasiado grande. Tamaño máximo permitido: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
    
    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
        throw new FileError(`Tipo de archivo no válido. Extensiones permitidas: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    // Additional MIME type check for security
    const validMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
    ];
    
    if (file.type && !validMimeTypes.includes(file.type)) {
        throw new FileError('El tipo de archivo no coincide con la extensión. Posible archivo corrupto.');
    }
}

// Parse Excel/CSV file to structured game data
function parseFileToGameData(file: File): Promise<GameData[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                
                // Convert to JSON instead of CSV
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
                
                if (jsonData.length === 0) {
                    throw new ValidationError('El archivo está vacío.');
                }
                
                const gameData = parseArrayToGameData(jsonData);
                resolve(gameData);
                
            } catch (err) {
                if (err instanceof ValidationError) {
                    reject(err);
                } else {
                    reject(new FileError('No se pudo procesar el archivo. Asegúrate de que es un archivo Excel o CSV válido.'));
                }
            }
        };
        
        reader.onerror = () => {
            reject(new FileError('Error al leer el archivo.'));
        };
        
        reader.readAsBinaryString(file);
    });
}

// Parse CSV text to structured game data
function parseCSVToGameData(csvText: string): GameData[] {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
        throw new ValidationError('Los datos CSV están vacíos.');
    }
    
    // Split each line by comma, handling quoted values
    const csvArray = lines.map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    });
    
    return parseArrayToGameData(csvArray);
}

// Convert 2D array to GameData objects
function parseArrayToGameData(data: string[][]): GameData[] {
    if (data.length < 2) {
        throw new ValidationError('El archivo debe tener al menos una fila de encabezados y una fila de datos.');
    }
    
    const headers = data[0].map(h => h.toLowerCase().trim());
    const requiredColumns = ['titulo', 'plataforma', 'genero', 'año', 'precio compra', 'estado', 'rareza'];
    const columnMapping: { [key: string]: string } = {
        'titulo': 'titulo',
        'title': 'titulo',
        'juego': 'titulo',
        'game': 'titulo',
        'plataforma': 'plataforma',
        'platform': 'plataforma',
        'consola': 'plataforma',
        'console': 'plataforma',
        'genero': 'genero',
        'género': 'genero',
        'genre': 'genero',
        'año': 'ano',
        'ano': 'ano',
        'year': 'ano',
        'fecha': 'ano',
        'precio compra': 'precio_compra',
        'precio': 'precio_compra',
        'price': 'precio_compra',
        'coste': 'precio_compra',
        'yourprice': 'precio_compra',
        'estado': 'estado',
        'condition': 'estado',
        'rareza': 'rareza',
        'rarity': 'rareza'
    };
    
    // Map headers to standard field names
    const fieldIndices: { [key: string]: number } = {};
    const marketPriceIndices: { [key: string]: number } = {};
    
    headers.forEach((header, index) => {
        const standardField = columnMapping[header];
        if (standardField) {
            fieldIndices[standardField] = index;
        }
        
        // Track market price columns separately
        const lowerHeader = header.toLowerCase();
        if (lowerHeader === 'priceloose') marketPriceIndices['precio_loose'] = index;
        if (lowerHeader === 'pricecib') marketPriceIndices['precio_cib'] = index;
        if (lowerHeader === 'pricenew') marketPriceIndices['precio_nuevo'] = index;
    });
    
    // Check for required columns
    const missingColumns = ['titulo', 'plataforma', 'precio_compra'].filter(
        field => fieldIndices[field] === undefined
    );
    
    if (missingColumns.length > 0) {
        const missingNames = missingColumns.map(field => {
            switch (field) {
                case 'titulo': return 'Título/Juego';
                case 'plataforma': return 'Plataforma/Consola';
                case 'precio_compra': return 'Precio/Coste';
                default: return field;
            }
        });
        throw new ValidationError(`Faltan columnas requeridas: ${missingNames.join(', ')}`);
    }
    
    // Parse data rows
    const games: GameData[] = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.every(cell => !cell || cell.trim() === '')) {
            continue; // Skip empty rows
        }
        
        try {
            const game: GameData = {
                titulo: String(row[fieldIndices.titulo] || '').trim(),
                plataforma: String(row[fieldIndices.plataforma] || '').trim(),
                genero: String(row[fieldIndices.genero] || '').trim() || 'No especificado',
                ano: parseInt(String(row[fieldIndices.ano] || '0').trim()) || 0,
                precio_compra: parseFloat(String(row[fieldIndices.precio_compra] || '0').replace(',', '.')) || 0,
                estado: String(row[fieldIndices.estado] || '').trim() || 'Usado',
                rareza: String(row[fieldIndices.rareza] || '').trim() || 'Común'
            };
            
            // Add market prices if available
            if (marketPriceIndices['precio_loose'] !== undefined) {
                const priceValue = parseFloat(String(row[marketPriceIndices['precio_loose']] || '0').replace(',', '.'));
                if (priceValue > 0) game.precio_loose = priceValue;
            }
            if (marketPriceIndices['precio_cib'] !== undefined) {
                const priceValue = parseFloat(String(row[marketPriceIndices['precio_cib']] || '0').replace(',', '.'));
                if (priceValue > 0) game.precio_cib = priceValue;
            }
            if (marketPriceIndices['precio_nuevo'] !== undefined) {
                const priceValue = parseFloat(String(row[marketPriceIndices['precio_nuevo']] || '0').replace(',', '.'));
                if (priceValue > 0) game.precio_nuevo = priceValue;
            }
            
            games.push(game);
        } catch (err) {
            throw new ValidationError(`Error en la fila ${i + 1}: ${err}`);
        }
    }
    
    if (games.length === 0) {
        throw new ValidationError('No se encontraron juegos válidos en los datos.');
    }
    
    return games;
}

// Validate parsed game data
function validateGameData(games: GameData[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (games.length === 0) {
        errors.push('No se encontraron juegos en los datos.');
        return { isValid: false, errors, warnings };
    }
    
    if (games.length > 1000) {
        warnings.push(`Gran cantidad de juegos (${games.length}). El análisis puede tardar más tiempo.`);
    }
    
    games.forEach((game, index) => {
        const rowNum = index + 2; // +2 because of header row and 1-based indexing
        
        // Required field validation
        if (!game.titulo) {
            errors.push(`Fila ${rowNum}: Falta el título del juego.`);
        }
        
        if (!game.plataforma) {
            errors.push(`Fila ${rowNum}: Falta la plataforma.`);
        }
        
        // Data type validation
        if (game.ano && (game.ano < 1970 || game.ano > new Date().getFullYear() + 2)) {
            warnings.push(`Fila ${rowNum}: Año sospechoso (${game.ano}) para "${game.titulo}".`);
        }
        
        if (game.precio_compra < 0) {
            errors.push(`Fila ${rowNum}: Precio no puede ser negativo para "${game.titulo}".`);
        }
        
        if (game.precio_compra > 10000) {
            warnings.push(`Fila ${rowNum}: Precio muy alto (€${game.precio_compra}) para "${game.titulo}".`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

// API Key validation function
async function validateAPIKey(): Promise<void> {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_api_key_here') {
        throw new APIError('Falta la clave de API de Gemini. Verifica tu archivo .env.local y asegúrate de que contiene GEMINI_API_KEY=tu_clave_real');
    }
    
    // Test the API key with a simple request
    try {
        const ai = new GoogleGenAI({ apiKey });
        const testModel = ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Test",
            config: {
                maxOutputTokens: 10
            }
        });
        
        // Set a timeout for the test request
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new APIError('Tiempo de espera agotado al validar la API key.')), 10000);
        });
        
        await Promise.race([testModel, timeoutPromise]);
        
    } catch (err: any) {
        if (err instanceof APIError) {
            throw err;
        }
        
        // Handle specific API errors
        const errorMessage = err?.message || '';
        
        if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid api key')) {
            throw new APIError('La clave de API de Gemini no es válida. Verifica que esté correcta en tu archivo .env.local');
        }
        
        if (errorMessage.includes('QUOTA_EXCEEDED') || errorMessage.includes('quota')) {
            throw new APIError('Has excedido la cuota de la API de Gemini. Espera un momento o verifica tu plan.');
        }
        
        if (errorMessage.includes('PERMISSION_DENIED')) {
            throw new APIError('Permisos denegados para la API de Gemini. Verifica que tu clave tenga los permisos necesarios.');
        }
        
        if (errorMessage.includes('MODEL_NOT_FOUND')) {
            throw new APIError('Modelo de IA no disponible. El servicio puede estar temporalmente inactivo.');
        }
        
        // Generic network/connection errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('connection')) {
            throw new APIError('Error de conexión. Verifica tu conexión a internet e inténtalo de nuevo.');
        }
        
        throw new APIError(`Error al validar la API key: ${errorMessage}`);
    }
}

// Enhanced error handling function
function handleAnalysisError(error: any): void {
    let errorMessage = 'Ocurrió un error desconocido al analizar la colección.';
    
    if (error instanceof FileError) {
        errorMessage = `Error en el archivo: ${error.message}`;
    } else if (error instanceof ValidationError) {
        errorMessage = `Error en los datos: ${error.message}`;
    } else if (error instanceof APIError) {
        errorMessage = `Error de API: ${error.message}`;
    } else if (error?.message) {
        // Handle specific Gemini API errors that might not be caught in validation
        const msg = error.message;
        
        if (msg.includes('QUOTA_EXCEEDED') || msg.includes('quota')) {
            errorMessage = 'Has excedido la cuota de la API de Gemini. Espera un momento o verifica tu plan.';
        } else if (msg.includes('SAFETY') || msg.includes('safety')) {
            errorMessage = 'La IA ha rechazado procesar los datos por motivos de seguridad. Revisa que no haya contenido inapropiado.';
        } else if (msg.includes('JSON') || msg.includes('parse')) {
            errorMessage = 'Error al procesar la respuesta de la IA. Inténtalo de nuevo.';
        } else {
            errorMessage = `Error inesperado: ${msg}`;
        }
    }
    
    showError(errorMessage);
}

function showLoading() {
    document.getElementById('input-section')?.classList.add('hidden');
    document.getElementById('dashboard-section')?.classList.add('hidden');
    document.getElementById('error-message')?.classList.add('hidden');
    document.getElementById('loading-section')?.classList.remove('hidden');
    updateLoadingProgress(10, "Iniciando análisis...");
}

// Random loading messages for retro gaming collection analysis
const loadingMessages = [
    "Incubating retro wisdom...",
    "Parsing pixel treasures...",
    "Cataloging digital artifacts...",
    "Evaluating nostalgia coefficients...",
    "Scanning for hidden gems...",
    "Cross-referencing rarity matrices...",
    "Calculating vintage volatility...",
    "Indexing collector sentiment...",
    "Processing market mutations...",
    "Analyzing scarcity patterns...",
    "Decoding price fluctuations...",
    "Synthesizing gaming genealogy...",
    "Triangulating trend trajectories...",
    "Calibrating collection chemistry...",
    "Optimizing portfolio potential...",
    "Distilling digital dividends...",
    "Harmonizing hardware heritage...",
    "Crystallizing cartridge values...",
    "Orchestrating ownership opportunities...",
    "Blueprinting buying behaviors..."
];

function getRandomLoadingMessage(): string {
    return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
}

function updateLoadingProgress(percentage: number, status?: string) {
    const progressBar = document.getElementById('progress-bar') as HTMLElement | null;
    const loadingStatus = document.getElementById('loading-status');
    
    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (loadingStatus) {
        // Use provided status or random message
        loadingStatus.textContent = status || getRandomLoadingMessage();
    }
}

function showError(message: string) {
    document.getElementById('input-section')?.classList.add('hidden');
    document.getElementById('loading-section')?.classList.add('hidden');
    document.getElementById('dashboard-section')?.classList.add('hidden');
    
    const errorSection = document.getElementById('error-message');
    if (errorSection) {
        errorSection.classList.remove('hidden');
        const errorText = document.getElementById('error-text');
        if (errorText) errorText.textContent = message;
        const restartButton = errorSection.querySelector('.restart-button');
        restartButton?.classList.remove('hidden');
    }
}

function displayDashboard(data: AnalysisResponse) {
    document.getElementById('loading-section')?.classList.add('hidden');
    document.getElementById('dashboard-section')?.classList.remove('hidden');

    // Safe display with fallbacks
    const totalGamesEl = document.getElementById('total-games');
    if (totalGamesEl) {
        totalGamesEl.textContent = (data.summary?.total_games || 0).toString();
    }
    
    const totalValueEl = document.getElementById('total-value');
    if (totalValueEl) {
        const value = data.summary?.estimated_collection_value || 0;
        totalValueEl.textContent = `€${value.toLocaleString('es-ES')}`;
    }
    
    const mainDecadeEl = document.getElementById('main-decade');
    if (mainDecadeEl) {
        mainDecadeEl.textContent = data.summary?.predominant_decade || 'No especificada';
    }

    renderChart(data.summary?.platform_distribution || []);
    renderConsoleFocus(data.console_focus);
    renderRecommendations('sell', data.sell_recommendations || []);
    renderRecommendations('keep', data.keep_recommendations || []);
    renderRecommendations('buy', data.buy_recommendations || []);
}

function renderChart(distribution: PlatformDistribution[]) {
    const chartContainer = document.getElementById('chart');
    const chartContainerWrapper = document.getElementById('chart-container');
    if (!chartContainer || !chartContainerWrapper) return;

    if (distribution && distribution.length > 0) {
        chartContainerWrapper.classList.remove('hidden');
        chartContainer.innerHTML = '';
        const maxValue = Math.max(...distribution.map(p => p.total_value));

        distribution.sort((a, b) => b.total_value - a.total_value).forEach(platform => {
            const barWrapper = document.createElement('div');
            barWrapper.className = 'chart-bar-wrapper';
            barWrapper.innerHTML = `
                <div class="chart-bar-label">${platform.platform}</div>
                <div class="chart-bar">
                    <div class="chart-bar-fill" style="width: ${(platform.total_value / maxValue) * 100}%" title="€${(platform.total_value || 0).toLocaleString('es-ES')}"></div>
                </div>
                <div class="chart-bar-value">€${(platform.total_value || 0).toLocaleString('es-ES')}</div>
            `;
            chartContainer.appendChild(barWrapper);
        });
    } else {
        chartContainerWrapper.classList.add('hidden');
    }
}

function renderConsoleFocus(focus: ConsoleFocus) {
    const container = document.getElementById('console-focus-card');
    if (!container) return;

    if (focus && focus.platform) {
        container.classList.remove('hidden');
        container.innerHTML = `
            <h4>Enfoque Recomendado: ${focus.platform}</h4>
            <p>${focus.reason}</p>
            <h5>Joyas con Potencial:</h5>
            <ul>
                ${focus.future_value_games.map(game => `<li><strong>${game.game}</strong> (Precio actual: ${game.current_price_range})</li>`).join('')}
            </ul>
        `;
    } else {
        container.classList.add('hidden');
    }
}

function renderRecommendations(type: 'sell' | 'keep' | 'buy', items: (SellRecommendation | KeepRecommendation | BuyRecommendation)[]) {
    const container = document.getElementById(`${type}-recommendations`);
    if (!container) return;

    container.innerHTML = '';
    if (!items || items.length === 0) {
        container.innerHTML = `<div class="recommendation-item empty-state"><p>No hay recomendaciones específicas en esta categoría.</p></div>`;
        return;
    }

    items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = `recommendation-item ${type}-item`;

        let priceHtml = '';
        if ('estimated_sale_price' in item) {
            priceHtml = `<span class="price sell-price">Venta: €${(item.estimated_sale_price || 0).toLocaleString('es-ES')}</span>`;
        } else if ('estimated_future_value' in item) {
            priceHtml = `<span class="price keep-price">Futuro: €${(item.estimated_future_value || 0).toLocaleString('es-ES')}</span>`;
        } else if ('target_price' in item) {
            priceHtml = `<span class="price buy-price">Objetivo: €${(item.target_price || 0).toLocaleString('es-ES')}</span>`;
        }

        itemEl.innerHTML = `
            <div class="item-header">
                <h3>${item.game} <span class="platform">(${item.platform})</span></h3>
                ${priceHtml}
            </div>
            <p>${item.reason}</p>
        `;
        container.appendChild(itemEl);
    });
}

function resetApp() {
    filesToUpload = null;

    const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
    const manualInput = document.getElementById('manual-input') as HTMLTextAreaElement | null;
    const fileMsg = document.querySelector('.file-msg') as HTMLElement | null;

    if (fileInput) fileInput.value = '';
    if (manualInput) manualInput.value = '';
    if (fileMsg) fileMsg.textContent = 'Arrastra y suelta tu archivo aquí o haz clic para seleccionar';

    updateAnalyzeButtonState();

    document.getElementById('input-section')?.classList.remove('hidden');
    document.getElementById('loading-section')?.classList.add('hidden');
    document.getElementById('dashboard-section')?.classList.add('hidden');
    document.getElementById('error-message')?.classList.add('hidden');
}
