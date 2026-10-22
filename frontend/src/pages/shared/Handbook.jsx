import KnowledgeLibrary from '../../components/handbook/KnowledgeLibrary';
import { useSearchParams } from 'react-router-dom';

export default function Handbook() {
  const [params] = useSearchParams();
  return <div className="w-full min-w-0 p-3 pb-24 sm:p-5"><KnowledgeLibrary initialCategory={params.get('category') || 'all'} /></div>;
}
