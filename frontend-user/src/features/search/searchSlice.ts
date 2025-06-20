import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SearchState } from '../../models/search';

const initialState: SearchState = {
  term: '',
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setSearchTerm(state, action: PayloadAction<string>) {
      state.term = action.payload;
    },
    clearSearchTerm(state) {
      state.term = '';
    }
  },
});

export const { setSearchTerm, clearSearchTerm } = searchSlice.actions;
export default searchSlice.reducer;