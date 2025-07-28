
class UsersHelper {
    constructor(ctx) {
        this.manager = ctx.mainConfigManager;
    }
    exsits(username) {
        return this.manager.get('users').list.find(item => item.username === username);
    }
    get(username){
        return this.manager.get('users').list.find(item => item.username === username);
    }
    addUser(username, password) {
        if (!this.exsits(username)) {
            this.manager.get('users').list.push({
                username,
                password
            });
            this.manager.save();
            return true;
        } else {
            return false;
        }
    }
    removeUser(username) {
        const index = this.manager.get('users').list.findIndex(item => item.username === username);
        if (index !== -1) {
            this.manager.get('users').list.splice(index, 1);
            this.manager.save();
            return true;
        } else {
            return false;
        }
    }
    changePassword(username, newPassword) {
        const index = this.manager.get('users').list.findIndex(item => item.username === username);
        if (index !== -1) {
            this.manager.get('users').list[index].password = newPassword;
            this.manager.save();
            return true;
        } else {
            return false;
        }
    }
    allowReg(){
        return this.manager.get('users').allowReg;
    }
}

module.exports = UsersHelper;

