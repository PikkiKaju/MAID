import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice.ts';
import searchReducer from '../features/search/searchSlice.ts';
import projectReducer from '../features/project/projectSlice.ts'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    search: searchReducer,
    project: projectReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;