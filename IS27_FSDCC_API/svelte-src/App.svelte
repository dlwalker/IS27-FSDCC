<script>
	import EmployeeList from './lib/EmployeeList.svelte';
import TreeNode from './lib/TreeNode.svelte';

	const url_root = 'API_ROOT_URL';

	function GetStaffDirectory() {
		const url = url_root + 'staffdirectory';

		fetch(url)
			.then(response => response.json())
			.then((data) => root = data)
			.catch(error => console.error('Failed to retrieve staff directory.', error));
	}
	
	function GetEmployees() {
		const url = url_root + 'employees';

		fetch(url)
			.then(response => response.json())
			.then(data => employeeList = data)
			.catch(error => console.error('Failed to retrieve employee list.', error));
	}

	async function PutEmployee(employee) {
		const url = url_root + 'employees/' + employee.employeeNumber;
		let response = await fetch(url, {
			method: 'PUT',
			headers: {
				'Accept': 'application/json',
      			'Content-Type': 'application/json'
			},
			body: JSON.stringify(employee)
		});
		
		if (!response.ok) {
			throw new Error(response.text());
		}
	}

	async function PostPosition(position){
		const url = url_root + 'positions/';
		let response = await fetch(url, {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
      			'Content-Type': 'application/json'
			},
			body: JSON.stringify(position)
		});

		if (!response.ok) {
			throw new Error(response.text());
		}
	}

	async function PutPosition(position) {
		const url = url_root + 'positions/' + position.positionNumber;
		let response = await fetch(url, {
			method: 'PUT',
			headers: {
				'Accept': 'application/json',
      			'Content-Type': 'application/json'
			},
			body: JSON.stringify(position)
		});

		if (!response.ok) {
			throw new Error(response.text());
		}
	}

	//Opens the form to insert a new position in the hierarchy
	function ShowNewPositionModal(supervisorPosition) {
		selectedSuper = supervisorPosition;
		showPositionModal = true;
	}

	function CreateNewPosition(newPosition, supervisorPositionNumber) {
		PostPosition({
			positionNumber: newPosition.positionNumber,
			title: newPosition.title,
			employeeNumber: null,
			supervisorPositionNumber: supervisorPositionNumber,
		})
		.then(GetStaffDirectory)
		.then(CloseNewPosition)
		.catch(error => console.error('Failed to create position.', error));
	}

	function CloseNewPosition() {
		showPositionModal = false;
	}
	
	//Opens the form for editing an employee's name
	function ShowEditEmployeeModal(employee) {
		selectedEmployee = employee;
		showEmployeeModal = true;
	}

	function UpdateEmployee(employee){
		PutEmployee(employee)
			.then(GetStaffDirectory)
			.then(CloseEditEmployee)
			.catch(error => console.error('Failed to update employee.', error));
	}

	function CloseEditEmployee() {
		showEmployeeModal = false;
	}
	
	//Opens the list to select an employee for assignment
	function ShowEmployeeList(position) {
		selectedPosition = position;
		GetEmployees();
		showEmployeeList = true;
	}

	function CloseEmployeeList() {
		showEmployeeList = false;
	}

	function AssignEmployee(position, employeeNumber) {
		position.employeeNumber = employeeNumber;

		PutPosition(position)
			.then(GetStaffDirectory)
			.then(CloseEmployeeList)
			.catch(error => console.error('Failed to update position.', error));
	}
	
	function UnassignEmployee(position) {
		position.employee = null;
		position.employeeNumber = null;

		PutPosition(position)
			.then(GetStaffDirectory)
			.catch(error => console.error('Failed to update position.', error));
	}
	
	let root = null;

	let showPositionModal = false;
	let selectedSuper = {};
	$: newPositionTitle = selectedSuper && `Add new position under Position No. ${selectedSuper.positionNumber}:  ${selectedSuper.title}`;
	let newPosition = {};
	
	let showEmployeeModal = false;
	let selectedEmployee;
	
	let showEmployeeList = false;
	let selectedPosition = {};
	$: listTitle = selectedPosition && `Assign employee to Position No. ${selectedPosition.positionNumber}:  ${selectedPosition.title}`;
	let employeeList = [];

	GetStaffDirectory();

</script>

{#if root}
	<!-- This key block forces the whole component to recreate itself. 
		For now it's the onl;y way I can find to refresh the compnent in all cases -->
	{#key root}
		<TreeNode node={root} childProp="subordinates" let:node>
			<div class="nodeContent">
				<span>
					<span>
						Title: {node.title}<br>
						Position Number: {node.positionNumber}
					</span>
					<button on:click={() => ShowNewPositionModal(node)}>New Subordinate Position</button>
				</span>
				<span>
					{#if node.employee}
						<span>
							Employee Number: {node.employee.employeeNumber}<br>
							Name: {node.employee.firstName} {node.employee.lastName}
						</span>
						<button on:click={() => ShowEditEmployeeModal(node.employee)}> Edit </button>
						<button on:click={() => UnassignEmployee(node)}> Unassign </button>
					{:else}
						Vacant
						<button on:click={() => ShowEmployeeList(node)}>Assign Employee</button>
					{/if}
				</span>
			</div>
		</TreeNode>
	{/key}
{:else}
	<p>Loading...</p>
{/if}

{#if showPositionModal}
	<div class="modal-background">
		<div class="modal-input">
			<p>{newPositionTitle}</p>
			<div class="modal-input-inner">
				<label>
					Position No
					<input type="number" bind:value={newPosition.positionNumber}/>
				</label>
				<label>
					Position Title
					<input type="text" bind:value={newPosition.title}/>
				</label>
				<span>
					<button on:click={() => CreateNewPosition(newPosition, selectedSuper.positionNumber)}>Save</button>
					<button on:click={CloseNewPosition}>Cancel</button>
				</span>

			</div>
		</div>
	</div>
{/if}

{#if showEmployeeModal}
	<div class="modal-background">
		<div class="modal-input">
			<p>Edit Employee No. {selectedEmployee.employeeNumber}</p>
			<div class="modal-input-inner">
				<label>
					First Name
					<input type="text" bind:value={selectedEmployee.firstName}/>
				</label>
				<label>
					Last Name
					<input type="text" bind:value={selectedEmployee.lastName}/>
				</label>
				<span>
					<button on:click={() => UpdateEmployee(selectedEmployee)}>Save</button>
					<button on:click={CloseEditEmployee}>Cancel</button>
				</span>

			</div>
		</div>
	</div>
{/if}

{#if showEmployeeList}
 <EmployeeList 
 	title={listTitle} 
	items={employeeList} 
	on:close={CloseEmployeeList}
	let:item = {employee}>
	<span>
		Employee No. {employee.employeeNumber}<br>{employee.firstName}  {employee.lastName}
	</span>
	<button on:click={() => AssignEmployee(selectedPosition, employee.employeeNumber)}>
		Select
	</button>
 </EmployeeList>
{/if}

<style>
    .nodeContent {
        display: flex;
        padding: 1em;
    }
    .nodeContent > span {
        width: 50%;
		display: flex;
		align-items: start;
		gap: 1em;
    }

	.modal-background {
		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.modal-input {
		border: 2px solid;
		background-color: white;
		padding: 1em 2em;
		
		display: flex;
		flex-direction: column;
	}
	.modal-input-inner {
		display: flex;
		flex-direction: column;
		align-items: end;
	}
</style>


	