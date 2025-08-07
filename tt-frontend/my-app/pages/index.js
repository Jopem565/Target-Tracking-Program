
export default function Home() {
	return (    <p>login works!</p>
    <button (click)="goToLindaSearch()">Login</button>
    
    <div>This is HomePage
		<p>
		Click on this <a href='/page1'><u>Link</u></a> to Go
		<b>/page1</b>
		Route
		</p>
	
		<p>
			Click on this <a href='/page2'><u>Link</u></a> to Go
			<b>/page2</b> Route
		</p>
	
	</div> );
}