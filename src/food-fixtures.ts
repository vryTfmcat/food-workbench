import type {Source} from './model.ts';
// Generic sample records keep unit tests deterministic without publishing vault data.
export const reportedFoods:Source[] = [
 ['frozen dumplings','sample stock; quantity unknown'],
 ['tomatoes','sample stock; use soon'],
 ['garlic','sample pantry item'],
].map(([title,note],i)=>({key:'fixture-stock-'+i,path:'',title,kind:'stock',supply:'have',note,expiry:'',places:[]}));
