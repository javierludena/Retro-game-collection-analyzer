# ¿Tienes colección?

> Retro game collection analyzer with Spanish humor 🎮

A web app that analyzes your retro video game collection using AI and provides expert recommendations on what to sell, keep, or buy - all with a touch of Spanish gaming community humor.

## 🚀 Features

- **📁 Multiple Input Methods**: Upload Excel/CSV files or manually enter your collection
- **🤖 AI-Powered Analysis**: Uses Google Gemini 2.5 Flash for intelligent recommendations  
- **🎯 Spanish Market Focus**: Prices and trends specific to the Spanish/European market
- **😄 Gamberro Humor**: Terms like "cutrefacto", "chinoso y plasticoso", and "punto limpio"
- **📊 Detailed Analytics**: Collection value, platform distribution, investment strategies
- **🎨 Dark Theme UI**: Modern responsive design with CSS custom properties

## 🛠️ Tech Stack

- **Frontend**: Vanilla TypeScript + Vite
- **AI**: Google Gemini 2.5 Flash API
- **File Processing**: SheetJS (XLSX)
- **Styling**: Custom CSS with CSS variables
- **Bundler**: Vite

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tienes-coleccion.git
   cd tienes-coleccion
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   # Create .env.local file
   echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env.local
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## 📝 Usage

1. **Upload Collection**: Drag & drop an Excel/CSV file or use manual entry
2. **Expected Format**: `Title, Platform, Genre, Year, Purchase Price, Condition, Rarity`
3. **Get Analysis**: AI provides recommendations on selling, keeping, or buying
4. **Enjoy the Humor**: Experience collection analysis with Spanish gaming community flair

## 🎯 Example Data Format

```csv
Title,Platform,Genre,Year,Purchase Price,Condition,Rarity
Super Mario Bros,NES,Platform,1985,45,Complete,Common
Metal Slug,Neo Geo,Shoot-em-up,1996,200,Cart Only,Rare
Chrono Trigger,SNES,RPG,1995,80,Complete,Uncommon
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build  
- `npm run preview` - Preview production build

## 🚧 Known Issues & Roadmap

See [MEJORAS_PENDIENTES.md](MEJORAS_PENDIENTES.md) for detailed improvement plans:

- **Critical**: Fix CSV→JSON processing for better performance
- **High**: Improve error handling and file validation
- **Medium**: Add mobile responsiveness and export features

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎮 Inspiration

Inspired by the Spanish retro gaming community's humor and terminology. Built for collectors who want serious analysis delivered with a smile.

## 🔗 Links

- [Live Demo](https://your-demo-url.com) _(coming soon)_
- [API Documentation](https://ai.google.dev/gemini-api/docs)
- [Issue Tracker](https://github.com/yourusername/tienes-coleccion/issues)

---

<div align="center">
<i>"Mañana Aliens tiene otra igual" 😄</i>
</div>
