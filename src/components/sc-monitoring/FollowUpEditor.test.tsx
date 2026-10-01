import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {beforeEach, expect, test, vi} from 'vitest';
import FollowUpEditor from './FollowUpEditor';
import type {ScFollowUpDetail} from '@/lib/api/sc-monitoring';
const {toast} = vi.hoisted(()=>({toast:vi.fn()}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast})}));
beforeEach(()=>vi.clearAllMocks());
const detail: ScFollowUpDetail = {followUpId:'f',contactId:'c',issueKey:'safety',category:'safety',description:'Concern',action:'Call provider',responsiblePerson:'SC',dueDate:'2026-10-02',priority:'routine',status:'open',outcome:'',overdue:false,authorName:'SC',createdAt:'2026-10-01T12:00Z',updatedAt:'2026-10-01T12:00Z',completedAt:null,revisionToken:'old',events:[],nextEventCursor:'event'};
test('conflicts retain plan drafts, require explicit reapply and save against the latest token', async()=> {
  const save=vi.fn().mockRejectedValueOnce({isAxiosError:true,response:{status:409}}).mockResolvedValue({...detail,action:'My action',revisionToken:'saved'});
  const latest={...detail,action:'Agency action',revisionToken:'new'};
  const load=vi.fn().mockResolvedValue(latest);const history=vi.fn().mockResolvedValue({items:[],nextCursor:null});
  render(<FollowUpEditor detail={detail} canEdit loadLatest={load} saveUpdate={save} loadEvents={history} onUnavailable={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Next action'),{target:{value:'My action'}});
  fireEvent.change(screen.getByLabelText('Reason for change'),{target:{value:'Provider delay'}});
  fireEvent.click(screen.getByRole('button',{name:'Save update'}));
  await screen.findByText('Latest details');expect(screen.getByLabelText('Next action')).toHaveValue('My action');expect(screen.getByRole('button',{name:'Save update'})).toBeDisabled();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({title:'Follow-up could not be saved',variant:'destructive'}));
  fireEvent.click(screen.getByRole('button',{name:'Reapply my draft'}));fireEvent.click(screen.getByRole('button',{name:'Save update'}));
  await waitFor(()=>expect(save).toHaveBeenLastCalledWith({action:'My action',changeReason:'Provider delay',revisionToken:'new'}));
  await waitFor(()=>expect(toast).toHaveBeenCalledWith(expect.objectContaining({title:'Follow-up saved',variant:'success'})));
});

test('voice textareas retain labels, required fields and text limits',()=> {
  render(<FollowUpEditor detail={detail} canEdit loadLatest={vi.fn()} saveUpdate={vi.fn()} loadEvents={vi.fn()} onUnavailable={vi.fn()} />);
  const action=screen.getByLabelText('Next action');
  expect(action).toBeRequired();
  fireEvent.mouseEnter(action.parentElement!);
  expect(screen.getByRole('button',{name:'Voice input'})).toBeInTheDocument();
  fireEvent.change(action,{target:{value:'a'.repeat(2001)}});
  expect(action).toHaveValue('a'.repeat(2000));
  expect(screen.getByLabelText('Reason for change')).toBeRequired();
});

test('unconfirmed follow-up saves show a warning to review the latest details and retain the draft',async()=> {
  render(<FollowUpEditor detail={detail} canEdit loadLatest={vi.fn()} saveUpdate={vi.fn().mockRejectedValue(new Error('Network unavailable'))} loadEvents={vi.fn()} onUnavailable={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Next action'),{target:{value:'Retained action'}});
  fireEvent.change(screen.getByLabelText('Reason for change'),{target:{value:'Provider delay'}});
  fireEvent.click(screen.getByRole('button',{name:'Save update'}));
  await waitFor(()=>expect(toast).toHaveBeenCalledWith(expect.objectContaining({title:'Check whether the follow-up was saved',variant:'destructive'})));
  expect(screen.getByLabelText('Next action')).toHaveValue('Retained action');
  expect(screen.getByRole('button',{name:'Save update'})).toBeDisabled();
});
test('older activity fetches only history and leaves the dirty action intact',async()=> {
  const load=vi.fn();const history=vi.fn().mockResolvedValue({items:[],nextCursor:null});
  render(<FollowUpEditor detail={detail} canEdit loadLatest={load} saveUpdate={vi.fn()} loadEvents={history} onUnavailable={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Next action'),{target:{value:'Draft action'}});fireEvent.click(screen.getByRole('button',{name:'Load older activity'}));
  await waitFor(()=>expect(history).toHaveBeenCalledWith('event',expect.any(AbortSignal)));expect(load).not.toHaveBeenCalled();expect(screen.getByLabelText('Next action')).toHaveValue('Draft action');
});

test('typing while a clean background read is pending does not lose the draft',async()=> {
  let finish: (value:ScFollowUpDetail)=>void = ()=>{};
  const load=vi.fn().mockReturnValue(new Promise<ScFollowUpDetail>(resolve=>{finish=resolve;}));
  render(<FollowUpEditor detail={detail} canEdit loadLatest={load} saveUpdate={vi.fn()} loadEvents={vi.fn()} onUnavailable={vi.fn()} />);
  fireEvent(window,new Event('focus'));expect(load).toHaveBeenCalledOnce();
  fireEvent.change(screen.getByLabelText('Next action'),{target:{value:'New unsaved action'}});
  finish({...detail,revisionToken:'new',action:'Agency action'});
  await screen.findByText('Latest details');expect(screen.getByLabelText('Next action')).toHaveValue('New unsaved action');expect(screen.getByRole('button',{name:'Save update'})).toBeDisabled();
});


test('SC status controls remain disabled through the post-save read',async()=> {
  let finish:(value:ScFollowUpDetail)=>void=()=>{};
  const load=vi.fn().mockReturnValue(new Promise<ScFollowUpDetail>(resolve=>{finish=resolve;}));
  render(<FollowUpEditor detail={detail} canEdit loadLatest={load} saveUpdate={vi.fn().mockResolvedValue({...detail,status:'in_progress',revisionToken:'new'})} loadEvents={vi.fn()} onUnavailable={vi.fn()} />);
  fireEvent.click(screen.getByRole('button',{name:'In progress'}));fireEvent.click(screen.getByRole('button',{name:'Save update'}));
  await waitFor(()=>expect(load).toHaveBeenCalledOnce());
  for(const name of ['Open','In progress','Completed']) expect(screen.getByRole('button',{name})).toBeDisabled();
  finish({...detail,status:'in_progress',revisionToken:'new'});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Open'})).toBeEnabled());
});

test('extending an overdue deadline through the calendar explains the status change and preserved history',async()=> {
  render(<FollowUpEditor detail={{...detail,overdue:true}} canEdit loadLatest={vi.fn()} saveUpdate={vi.fn()} loadEvents={vi.fn()} onUnavailable={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', {name:/Due date/}));
  fireEvent.click(await screen.findByRole('button', {name:/October 5th, 2026/}));
  expect(screen.getByText('Changing the due date changes its overdue status. The previous date and your reason will remain in history.')).toBeInTheDocument();
});
