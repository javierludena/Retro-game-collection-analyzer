/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";

// Make xlsx library available from the script tag in index.html
declare var XLSX: any;

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
        const collectionData = await getCollectionData();
        if (!collectionData) {
            showError("Por favor, proporciona datos de tu colección.");
            return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
        Eres un experto coleccionista de videojuegos retro con un tono gamberro y divertido, especializado en el mercado español. Usas expresiones únicas como "chinoso y plasticoso", "cutrefacto" y "punto limpio" para los juegos malos.

        Como experto coleccionista, tienes:
        - 20+ años revisando consolas y videojuegos, desde las más cutrefactas hasta las joyas más brillantes
        - Conocimiento profundo del mercado español de coleccionismo
        - Una obsesión sana con Neo Geo y Metal Slug que se nota en todos tus análisis
        - Experiencia detectando clones chinosos, reproductions y consolas de dudosa calidad
        - Frases míticas como "no tienes colección si no tienes..." seguido de joyas imprescindibles

        Analiza esta colección con tu estilo característico pero manteniendo el profesionalismo:
        Formato de datos: CSV con columnas: Título, Plataforma, Género, Año, Precio Compra, Estado, Rareza

        Datos de la Colección:
        ${collectionData}

        Dame tu análisis experto considerando:
        - Qué juegos son "punto limpio" directo (malos que hay que vender ya)
        - Joyas auténticas vs reproductions cutrefactas
        - Referencias obligatorias a Neo Geo cuando sea relevante
        - Estrategias de coleccionismo que otros no conocen 
        - Comentarios tipo "no tienes colección si no tienes..." para joyas imprescindibles
        - Precios reales del mercado español (que conoces mejor que nadie)

        IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON estructurado. No pongas introducción ni formato markdown. Todas las monedas en Euros (€). Que se note tu personalidad en las razones y comentarios, pero manteniendo rigor en datos y valoraciones.
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


        updateLoadingProgress(30, "Enviando datos a la IA...");

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        updateLoadingProgress(70, "Procesando la respuesta...");

        const analysisResult: AnalysisResponse = JSON.parse(response.text);

        updateLoadingProgress(100, "¡Análisis completo!");
        setTimeout(() => displayDashboard(analysisResult), 500);

    } catch (error) {
        console.error("Error during analysis:", error);
        showError("Ocurrió un error al analizar la colección. Por favor, revisa el formato de tus datos y vuelve a intentarlo.");
    }
}

function getCollectionData(): Promise<string> {
    return new Promise((resolve, reject) => {
        const activeTab = document.querySelector('.tab-button.active')?.id;
        if (activeTab === 'tab-file' && filesToUpload) {
            const file = filesToUpload[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const csvData = XLSX.utils.sheet_to_csv(sheet);
                    resolve(csvData);
                } catch (err) {
                    reject(new Error("No se pudo procesar el archivo. Asegúrate de que es un .xlsx o .csv válido."));
                }
            };
            reader.onerror = () => reject(new Error("Error al leer el archivo."));
            reader.readAsBinaryString(file);
        } else if (activeTab === 'tab-manual') {
            const manualInput = document.getElementById('manual-input') as HTMLTextAreaElement | null;
            resolve(manualInput?.value.trim() ?? '');
        } else {
            resolve('');
        }
    });
}

function showLoading() {
    document.getElementById('input-section')?.classList.add('hidden');
    document.getElementById('dashboard-section')?.classList.add('hidden');
    document.getElementById('error-message')?.classList.add('hidden');
    document.getElementById('loading-section')?.classList.remove('hidden');
    updateLoadingProgress(10, "Iniciando análisis...");
}

function updateLoadingProgress(percentage: number, status: string) {
    const progressBar = document.getElementById('progress-bar') as HTMLElement | null;
    const loadingStatus = document.getElementById('loading-status');
    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (loadingStatus) loadingStatus.textContent = status;
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

    document.getElementById('total-games')!.textContent = data.summary.total_games.toString();
    document.getElementById('total-value')!.textContent = `€${data.summary.estimated_collection_value.toLocaleString('es-ES')}`;
    document.getElementById('main-decade')!.textContent = data.summary.predominant_decade;

    renderChart(data.summary.platform_distribution);
    renderConsoleFocus(data.console_focus);
    renderRecommendations('sell', data.sell_recommendations);
    renderRecommendations('keep', data.keep_recommendations);
    renderRecommendations('buy', data.buy_recommendations);
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
                    <div class="chart-bar-fill" style="width: ${(platform.total_value / maxValue) * 100}%" title="€${platform.total_value.toLocaleString('es-ES')}"></div>
                </div>
                <div class="chart-bar-value">€${platform.total_value.toLocaleString('es-ES')}</div>
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
            priceHtml = `<span class="price sell-price">Venta: €${item.estimated_sale_price.toLocaleString('es-ES')}</span>`;
        } else if ('estimated_future_value' in item) {
            priceHtml = `<span class="price keep-price">Futuro: €${item.estimated_future_value.toLocaleString('es-ES')}</span>`;
        } else if ('target_price' in item) {
            priceHtml = `<span class="price buy-price">Objetivo: €${item.target_price.toLocaleString('es-ES')}</span>`;
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
