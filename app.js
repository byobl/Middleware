const express = require('express')

const app = express()

app.set('port', process.env.PORT || 3000)

app.get('/', (req, res) => {
    res.type('text/plain')
    res.send('Silok')
})




app.use((req, res) => {
    res.type('text/plain')
    res.status(404)
    res.send('404 - Not Found')
})

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.type('text/plain')
    res.status(500)
    res.send('500 - Server Error')
})

app.listen(app.get('port'), () => {
    console.log('Express started on http://localhost' + app.get('port') + '; Press Ctrl-C to terminate.')
})