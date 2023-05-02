<script>
	import TreeNode from './lib/TreeNode.svelte';

	const url_root = 'API_ROOT_URL';

	function GetStaffDirectory(){
		const url = url_root + 'staffdirectory';

		fetch(url)
			.then(response => response.json())
			.then(data => root = data)
			.catch(error => console.error('Failed to retrieve staff directory.', error));
	}


	function UnassignEmployee(position) {
		position.employee = null;
		position.employeeNumber = null;

		PutPosition(position);
	}

	function PutEmployee(employee) {
		const url = url_root + 'employees/' + employee.employeeNumber;
		fetch(url, {
			method: 'PUT',
			headers: {
				'Accept': 'application/json',
      			'Content-Type': 'application/json'
			},
			body: JSON.stringify(employee)
		})
		.then(() => GetStaffDirectory())
  		.catch(error => console.error('Unable to update item.', error));
	}

	function PutPosition(position) {
		const url = url_root + 'positions/' + position.positionNumber;
		fetch(url, {
			method: 'PUT',
			headers: {
				'Accept': 'application/json',
      			'Content-Type': 'application/json'
			},
			body: JSON.stringify(position)
		})
		.then(() => GetStaffDirectory())
  		.catch(error => console.error('Unable to update item.', error));
	}
	
	function ShowEditEmployeeModal(employee) {
		selectedEmployee = employee;
		showModal = true;
	}

	function UpdateEmployee(employee){
		PutEmployee(employee);
		CloseModal();
	}

	function CloseModal() {
		showModal = false;
	}
	
	let showModal = false;
	let selectedEmployee;

	let root = null;
	GetStaffDirectory();

</script>

{#if root}
	<TreeNode node={root} childProp="subordinates" let:node>
		<div class="nodeContent">
			<span>
				Title: {node.title}<br>
				Position Number: {node.positionNumber}
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
					<button>Assign Employee</button>
				{/if}
			</span>
		</div>
	</TreeNode>
{:else}
	<p>Loading...</p>
{/if}

{#if showModal}
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
					<button on:click={() => UpdateEmployee(selectedEmployee)}>Submit</button>
					<button on:click={CloseModal}>Cancel</button>
				</span>

			</div>
		</div>
	</div>
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


	