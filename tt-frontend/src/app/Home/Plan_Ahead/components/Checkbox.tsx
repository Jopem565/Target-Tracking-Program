import {EventInput} from '@fullcalendar/core';

// Logic for checking off holidays to take off
export const Checkbox = ({holidayName, holidays, checked, checkboxToPage, disabled} : 
    {holidayName : string, holidays : EventInput[], checked : boolean, checkboxToPage : 
    (holidays : EventInput[]) => void, disabled : boolean}) => { 

    let updatedHolidays : EventInput[] = [];

    //change checked state to be opposite when it is clicked 
    const changeActivation = () => {

        const newIsActivated = !checked;
        //if checkbox is checked
        if (newIsActivated) {
            //filter out every holiday except the one that is to be activated 
            updatedHolidays = holidays.map((event : EventInput) => {
                //if event we are looking for 
                if (event.title === holidayName){
                    return {
                        ...event,
                        holidayActivated : newIsActivated,
                    }
                }
                return event;
            });
        }

        //if checkbox is not checked
        else if (!newIsActivated) {
            //filter out every holiday except the one that is to be deactivated 
            updatedHolidays = holidays.map((event : EventInput) => {
                //if event we are looking for 
                if (event.title === holidayName){
                    return {
                        ...event,
                        holidayActivated : newIsActivated,
                    }
                }
                return event;
            });
        }
        checkboxToPage(updatedHolidays);
    }

    return ( 
        <div className = "checkboxes">
            <input type='checkbox' checked = {checked} onChange = {changeActivation} id={holidayName} name = {holidayName} value= {holidayName} disabled = {disabled}></input> 
            <label htmlFor = {holidayName}> {holidayName} </label><br></br>
        </div>
    )
}