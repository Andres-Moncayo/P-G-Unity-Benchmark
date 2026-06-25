# 🎯 G-Unity Benchmark: Project Guide for AI Agents

## 📋 **Project Overview**

**G-Unity Benchmark** is a strategic operational hub designed for Unity executives to monitor competitive intelligence, market trends, and operational metrics in real-time. This is a React + TypeScript application built with modern web technologies.

### **Target Audience**
- C-Level executives at Unity
- Operations directors  
- Product strategy managers
- Competitive intelligence analysts

---

## 🏗️ **Technology Stack**

### **Core Framework**
- **React 18** with TypeScript (strict mode)
- **Vite** for fast development and building
- **Tailwind CSS v4** for styling with clsx and tailwind-merge utilities

### **State Management**
- **Zustand** for global state management (auth, navigation, settings)
- **TanStack Query v5** for server state management and caching
- **Zod** for runtime type validation

### **UI & Assets**
- **FontAwesome** for icons
- **Recharts** for data visualization
- **TSParticles** for ambient visual effects
- Custom images and brand assets

### **Development Tools**
- **Husky** for git hooks
- **TypeScript** for type safety
- **PostCSS** for CSS processing

---

## 📁 **Project Structure**

```
src/
├── assets/                   # Static assets (images, icons)
├── components/
│   ├── layout/              # Layout components (Sidebar, Header)
│   └── ui/                  # Reusable UI components
├── features/                # Feature-based architecture
│   ├── analytics/           # Analytics dashboard
│   ├── chat-ia/             # AI-powered chat interface
│   ├── competitors/         # Competitor analysis
│   ├── dashboard/           # Main dashboard
│   ├── monitorization/      # Real-time monitoring
│   └── settings/            # Application settings
├── hooks/                   # Custom React hooks
├── services/                # API clients and external services
├── store/                   # Zustand stores
├── styles/                  # Global styles
└── utils/                   # Utility functions
```

### **Feature Architecture Pattern**
Each feature follows this structure:
```
feature-name/
├── components/              # Feature-specific components
├── hooks/                   # Feature-specific hooks
├── services/                # API calls and data fetching
├── types/                   # TypeScript types with Zod schemas
└── index.ts                 # Public exports
```

---

## 🎨 **Design System**

### **Color Palette**
- **Primary**: Black background (#000000, #0F0F0F)
- **Accent**: Blue (#00ADEF, #35b4ff)
- **Success**: Green (#3DDC84, #3ddb9b)
- **Warning**: Orange/Yellow (#FFC107)
- **Error**: Red (#FF4C4C)
- **Text**: White (#FFFFFF) with grays (#B0B0B0, #888888)

### **UI Patterns**
- **Unity-inspired design** with grid backgrounds and ambient glows
- **Rounded corners** (28px-30px) for cards
- **Border accents** (#3A3A3A) for depth
- **Glass morphism** effects with subtle transparencies
- **Responsive design** with mobile-first approach

### **Component Guidelines**
- Use **clsx** for conditional class names
- Use **tailwind-merge** for combining className props
- Follow **feature-first** component organization
- Implement **loading states** and **error boundaries**
- Use **Zod validation** for all data structures

---

## 🔧 **Development Workflow**

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
```

### **Code Standards**
- **TypeScript strict mode** enabled
- **Feature-first architecture** required
- **Zod validation** for all external data
- **TanStack Query** for API calls
- **Responsive design** mandatory
- **Accessibility** considerations required

### **Git Hooks**
- **Pre-push hook** configured via Husky
- Ensure code passes linting before commits

---

## 🌐 **API Integration**

### **Current State**
- **Mock data** implemented for all features
- **API client** structure ready in `src/services/apiClient.ts`
- **TanStack Query** hooks implemented for data fetching
- **Zod schemas** define data contracts

### **API Integration Pattern**
```typescript
// 1. Define Zod schema for validation
const ResponseSchema = z.object({...});

// 2. Create API service function
export const getData = async () => {
  const data = await apiClient<unknown>('/endpoint');
  return ResponseSchema.parse(data);
};

// 3. Create TanStack Query hook
export function useData() {
  return useQuery({
    queryKey: ['data-key'],
    queryFn: getData,
  });
}

// 4. Use in component with loading/error states
const { data, isLoading, isError } = useData();
```

---

## 🔒 **Security & Best Practices**

### **Type Safety**
- **Strict TypeScript** configuration
- **Zod validation** at API boundaries
- **No `any` types** allowed
- **Proper error handling** with try-catch

### **Performance**
- **Code splitting** via Vite
- **TanStack Query caching** strategies
- **Lazy loading** for heavy components
- **Optimized images** and assets

### **Security**
- **Environment variables** for敏感 data
- **CORS** configuration for API calls
- **Input validation** with Zod
- **No exposed secrets** in client code

---

## 📱 **Responsiveness**

### **Breakpoints**
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

### **Patterns**
- **Mobile-first** CSS approach
- **Responsive grid** systems
- **Touch-friendly** interactions
- **Adaptive layouts** per feature

---

## 🎯 **Agent Capabilities**

### **What You Can Do**
- ✅ **Add new features** following feature-first architecture
- ✅ **Modify existing components** and UI patterns
- ✅ **Implement new API integrations** with proper validation
- ✅ **Add new visualizations** using Recharts
- ✅ **Optimize performance** and code quality
- ✅ **Update styling** following design system
- ✅ **Add new pages** and navigation routes

### **Rules to Follow**
- 🚫 **Never remove** existing Zod validation
- 🚫 **Never bypass** TanStack Query for API calls
- 🚫 **Never use** direct `fetch` without `apiClient`
- 🚫 **Never break** TypeScript strict mode
- 🚫 **Never ignore** responsive design requirements
- 🚫 **Never expose** sensitive data in client code

### **New Feature Template**
```typescript
// 1. Create feature folder under src/features/
// 2. Follow established structure:
├── components/
├── hooks/
├── services/
├── types/
└── index.ts

// 3. Export from src/features/index.ts
export * from './new-feature';
```

---

## 🚀 **Backend Integration Steps**

### **FastAPI Python Integration**

1. **Set up FastAPI Backend**
   ```bash
   # Create backend directory
   mkdir g-unity-benchmark-backend
   cd g-unity-benchmark-backend
   
   # Initialize Python environment
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   
   # Install FastAPI and dependencies
   pip install fastapi uvicorn pydantic python-multipart
   ```

2. **Create Main FastAPI App**
   ```python
   # main.py
   from fastapi import FastAPI
   from fastapi.middleware.cors import CORSMiddleware
   
   app = FastAPI(title="G-Unity Benchmark API")
   
   # Configure CORS for React frontend
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173"],  # Vite dev server
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   
   @app.get("/api/dashboard/metrics")
   async def get_dashboard_metrics():
       return {
           "topCards": [...],
           "updateItems": [...],
           # Match your frontend Zod schema exactly
       }
   ```

3. **Update Frontend API Client**
   ```typescript
   // src/services/apiClient.ts
   const BASE_URL = 'http://localhost:8000/api';  # FastAPI default port
   ```

4. **Run Backend Server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Update Development Scripts**
   ```json
   // package.json
   {
     "scripts": {
       "dev:full": "concurrently \"npm run dev\" \"npm run dev:backend\"",
       "dev:backend": "cd ../g-unity-benchmark-backend && uvicorn main:app --reload"
     }
   }
   ```

6. **Environment Configuration**
   ```bash
   # .env.example
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_API_TIMEOUT=10000
   ```

### **Production Deployment Considerations**

1. **Dockerize both frontend and backend**
2. **Set up proper CORS for production domains**
3. **Configure environment variables**
4. **Implement proper authentication if needed**
5. **Set up API rate limiting and security**

---

## 📞 **Contact & Support**

For questions about this project:
- **Architecture**: Refer to manuals/ directory
- **API Integration**: Follow established patterns
- **UI Guidelines**: Use existing components as reference
- **Business Context**: See `manuals/contexto_estrategico.md`

**Remember**: This is a strategic tool for Unity executives. Always prioritize clarity, performance, and professional presentation.