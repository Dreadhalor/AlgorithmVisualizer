import { useEffect } from 'react';

const TopNav = ({ active_type, setMode }) => {
  const changeMode = (event) => {
    let value = parseInt(event.target.value);
    active_type.active = value;
    setMode(value);
  };

  useEffect(() => {
    //christ this is all very hacky, I'm definitely just barely learning React
    setMode(active_type.active);
  }, []);

  return (
    <div className='border-b bg-slate-200 flex flex-row justify-around'>
      <span className='flex-1'></span>
      <p className='font-bold'>Tile type:</p>
      <div onChange={changeMode}>
        <span className='px-1'>
          <input
            defaultChecked
            type='radio'
            className='mr-1'
            id='start'
            name='tile_mode'
            value='1'
          />
          <label htmlFor='start'>Start</label>
        </span>
        <span className='px-1'>
          <input
            type='radio'
            className='mr-1'
            id='end'
            name='tile_mode'
            value='2'
          />
          <label htmlFor='end'>End</label>
        </span>
        <span className='px-1'>
          <input
            type='radio'
            className='mr-1'
            id='wall'
            name='tile_mode'
            value='3'
          />
          <label htmlFor='wall'>Wall</label>
        </span>
      </div>
      <span className='flex-1'></span>
    </div>
  );
};

export default TopNav;