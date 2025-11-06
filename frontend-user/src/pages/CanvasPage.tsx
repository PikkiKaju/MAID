import CanvasTabs from '../components/canvas/CanvasTabs';

export default function CanvasPage() {
  return (
    <div className='h-full flex flex-col'>
      <div className='px-4 py-3 border-b bg-white'>
        <h2 className='text-xl font-semibold text-slate-700'>Model Builder Canvas</h2>
      </div>
      <div className='flex-1 min-h-0'>
        <CanvasTabs />
      </div>
    </div>
  );
}
