import ModelCanvas from '../components/canvas/ModelCanvas';

export default function CanvasPage() {
  return (
    <div className='space-y-4'>
      <h2 className='text-xl font-semibold text-slate-700'>Model Builder Canvas</h2>
      <ModelCanvas />
    </div>
  );
}
